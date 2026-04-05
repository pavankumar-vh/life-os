import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { ChatMessage } from '../models/ChatMessage'
import { audit } from '../lib/audit'
import { User } from '../models/User'
import { buildSmartContext } from '../lib/contextEngine'

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many chat requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
})

const router = Router()
router.use(authMiddleware)

const SYSTEM_PROMPT = `You are the LifeOS AI Assistant — a personal, data-driven companion embedded in the user's life management platform.

You have access to rich, pre-analyzed data including trends, averages, correlations, and patterns computed from the user's LifeOS data (journals, habits, tasks, goals, workouts, sleep, nutrition, body composition, expenses, reading, and more).

YOUR ROLE:
- Answer questions about the user's data with specific numbers, trends and deltas
- Provide personalized insights: "Your mood is 0.4 higher on gym days" not just "exercise helps mood"
- Spot patterns: consistency gaps, overdue deadlines, undertrained muscle groups, sleep debt
- Help with goal planning, habit optimization, and self-reflection
- Give actionable, concrete recommendations grounded in their actual data
- Also answer general knowledge questions when asked

GUIDELINES:
- Always cite specific data points and numbers when available — the user expects precision
- Compare week-over-week, current vs average, this month vs last month
- Flag warnings proactively: overdue tasks, sleep deficit, missed habits, spending spikes
- Be concise and direct — no filler. Use markdown formatting
- If data is limited or absent for a topic, say so honestly
- Never fabricate data — only reference what's in the context below
- When the user asks about progress, compare against their own historical baseline, not generic standards`

// GET /api/chat — get chat history
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json([])
    const messages = await ChatMessage.find({ userId }).sort({ createdAt: -1 }).limit(50).lean()
    return res.json(messages.reverse())
  } catch (e) {
    console.error('GET /api/chat error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/chat — send message (streaming SSE)
router.post('/', chatLimiter, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { message, provider = 'openai', model } = req.body

    if (!message || typeof message !== 'string' || message.length > 4000) {
      return res.status(400).json({ error: 'Invalid message' })
    }

    const ALLOWED_PROVIDERS = ['openai', 'gemini', 'anthropic']
    if (typeof provider !== 'string' || !ALLOWED_PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' })
    }

    if (model && (typeof model !== 'string' || !/^[a-zA-Z0-9._-]+$/.test(model))) {
      return res.status(400).json({ error: 'Invalid model name' })
    }

    if (isDemoUser(userId)) {
      return res.status(400).json({ error: 'Chat is not available in demo mode' })
    }

    // Read API key from user settings in DB (never from client)
    const user = await User.findById(userId).select('settings.aiKeys').lean()
    const key = (user?.settings as any)?.aiKeys?.[provider] || process.env.OPENAI_API_KEY
    if (!key) {
      return res.status(400).json({ error: 'No API key configured. Add your API key in settings.' })
    }

    const history = await ChatMessage.find({ userId }).sort({ createdAt: -1 }).limit(20).lean()
    history.reverse()

    const userContext = await buildSmartContext(userId)
    const systemContent = SYSTEM_PROMPT + (userContext ? `\n\nUSER'S CURRENT DATA:\n${userContext}` : '')

    const historyMessages = history.map((m: any) => ({
      role: m.role as string,
      content: m.content as string,
    }))

    let providerResponse: Response

    if (provider === 'gemini') {
      const geminiModel = model || 'gemini-2.0-flash'
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${key}`
      const contents = [
        ...historyMessages.map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: message }] },
      ]
      providerResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_instruction: { parts: [{ text: systemContent }] }, contents, generationConfig: { temperature: 0.7, maxOutputTokens: 1500 } }),
      })
    } else if (provider === 'anthropic') {
      const claudeModel = model || 'claude-sonnet-4-20250514'
      providerResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: claudeModel, max_tokens: 1500, system: systemContent, messages: [...historyMessages, { role: 'user', content: message }], stream: true }),
      })
    } else {
      const openaiModel = model || 'gpt-4o-mini'
      providerResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: openaiModel, messages: [{ role: 'system', content: systemContent }, ...historyMessages, { role: 'user', content: message }], stream: true, max_tokens: 1500, temperature: 0.7 }),
      })
    }

    if (!providerResponse.ok) {
      const errText = await providerResponse.text()
      let errMsg = `${provider} API error`
      try { const errJson = JSON.parse(errText); errMsg = errJson.error?.message || errMsg } catch {}
      return res.status(providerResponse.status).json({ error: errMsg })
    }

    // Stream SSE to client
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    let fullContent = ''
    const reader = providerResponse.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) { res.end(); return }

    let buffer = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const rawLine of lines) {
          const line = rawLine.trim()

          if (provider === 'openai' && line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content
              if (content) { fullContent += content; res.write(`data: ${JSON.stringify({ content })}\n\n`) }
            } catch {}
          }

          if (provider === 'gemini' && line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
              if (text) { fullContent += text; res.write(`data: ${JSON.stringify({ content: text })}\n\n`) }
            } catch {}
          }

          if (provider === 'anthropic' && line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                fullContent += parsed.delta.text
                res.write(`data: ${JSON.stringify({ content: parsed.delta.text })}\n\n`)
              }
            } catch {}
          }
        }
      }

      const savedUser = await ChatMessage.create({ userId, role: 'user', content: message })
      const savedAssistant = await ChatMessage.create({ userId, role: 'assistant', content: fullContent })
      audit(userId, 'create', 'chat_messages', savedUser._id, { after: { role: 'user', content: message } })
      audit(userId, 'create', 'chat_messages', savedAssistant._id, { after: { role: 'assistant', content: fullContent } })

      res.write(`data: ${JSON.stringify({
        savedMessages: [
          { _id: savedUser._id, role: 'user', content: message, createdAt: savedUser.createdAt },
          { _id: savedAssistant._id, role: 'assistant', content: fullContent, createdAt: savedAssistant.createdAt },
        ]
      })}\n\n`)
      res.write('data: [DONE]\n\n')
    } catch (err) {
      console.error('Stream error:', err)
      try { res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`) } catch {}
    } finally {
      res.end()
    }
  } catch (e) {
    console.error('POST /api/chat error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/chat — clear chat history
router.delete('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json({ ok: true })
    const existing = await ChatMessage.find({ userId }).lean()
    await ChatMessage.deleteMany({ userId })
    audit(userId, 'delete', 'chat_messages', 'all', { before: { count: existing.length } })
    return res.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/chat error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
