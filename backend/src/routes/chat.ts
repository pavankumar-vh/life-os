import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { ChatMessage } from '../models/ChatMessage'
import { Journal } from '../models/Journal'
import { Habit } from '../models/Habit'
import { Task } from '../models/Task'
import { Goal } from '../models/Goal'
import { Expense } from '../models/Expense'
import { Workout } from '../models/Workout'
import { Meal } from '../models/Meal'
import { BodyLog } from '../models/BodyLog'
import { SleepLog } from '../models/SleepLog'
import { WaterLog } from '../models/WaterLog'
import { Gratitude } from '../models/Gratitude'
import { Book } from '../models/Book'

const router = Router()
router.use(authMiddleware)

async function gatherUserContext(userId: string): Promise<string> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const isoToday = now.toISOString().split('T')[0]

  const [
    recentJournals, habits, pendingTasks, goals, recentExpenses,
    recentWorkouts, recentMeals, recentBody, recentSleep,
    todayWater, recentGratitude, books,
  ] = await Promise.all([
    Journal.find({ userId }).sort({ date: -1 }).limit(7).lean(),
    Habit.find({ userId }).lean(),
    Task.find({ userId, status: { $ne: 'done' } }).sort({ dueDate: 1 }).limit(20).lean(),
    Goal.find({ userId }).lean(),
    Expense.find({ userId, createdAt: { $gte: thirtyDaysAgo } }).lean(),
    Workout.find({ userId }).sort({ date: -1 }).limit(5).lean(),
    Meal.find({ userId }).sort({ date: -1 }).limit(7).lean(),
    BodyLog.find({ userId }).sort({ date: -1 }).limit(5).lean(),
    SleepLog.find({ userId }).sort({ date: -1 }).limit(7).lean(),
    WaterLog.find({ userId, date: isoToday }).lean(),
    Gratitude.find({ userId }).sort({ date: -1 }).limit(7).lean(),
    Book.find({ userId }).lean(),
  ])

  const sections: string[] = []

  if (recentJournals.length) {
    sections.push(`RECENT JOURNAL ENTRIES (last 7):\n${recentJournals.map((j: any) =>
      `- ${j.date}: mood=${j.mood}/5, energy=${j.energy}/5${j.title ? `, "${j.title}"` : ''}${j.content ? ` — ${(j.content as string).slice(0, 200)}` : ''}`
    ).join('\n')}`)
  }
  if (habits.length) {
    sections.push(`HABITS (${habits.length} total):\n${habits.map((h: any) =>
      `- ${h.name}: streak=${h.streak}, best=${h.bestStreak}, frequency=${h.frequency}`
    ).join('\n')}`)
  }
  if (pendingTasks.length) {
    sections.push(`PENDING TASKS (${pendingTasks.length}):\n${pendingTasks.map((t: any) =>
      `- [${t.priority}] ${t.title}${t.dueDate ? ` (due: ${t.dueDate})` : ''} — ${t.status}`
    ).join('\n')}`)
  }
  if (goals.length) {
    sections.push(`GOALS:\n${goals.map((g: any) =>
      `- ${g.title}: ${g.progress}% complete${g.deadline ? ` (deadline: ${g.deadline})` : ''}`
    ).join('\n')}`)
  }
  if (recentExpenses.length) {
    const total = recentExpenses.reduce((s: number, e: any) => s + (e.amount || 0), 0)
    sections.push(`EXPENSES (last 30 days): $${total.toFixed(2)} total across ${recentExpenses.length} entries`)
  }
  if (recentWorkouts.length) {
    sections.push(`RECENT WORKOUTS:\n${recentWorkouts.map((w: any) =>
      `- ${w.date}: ${w.name || 'Workout'}${w.exercises ? ` (${w.exercises.length} exercises)` : ''}`
    ).join('\n')}`)
  }
  if (recentSleep.length) {
    sections.push(`RECENT SLEEP:\n${recentSleep.map((s: any) =>
      `- ${s.date}: ${s.bedtime}→${s.waketime}, quality=${s.quality}/5, ${s.hours || '?'}h`
    ).join('\n')}`)
  }
  if (recentBody.length) {
    const latest = recentBody[0] as any
    sections.push(`BODY TRACKING (latest): weight=${latest.weight || '?'}kg, bodyFat=${latest.bodyFat || '?'}%`)
  }
  if (todayWater.length) {
    const total = todayWater.reduce((s: number, w: any) => s + (w.glasses || 0), 0)
    sections.push(`WATER TODAY: ${total} glasses`)
  }
  if (recentGratitude.length) {
    sections.push(`RECENT GRATITUDE:\n${recentGratitude.map((g: any) =>
      `- ${g.date}: ${g.items?.join(', ') || ''}`
    ).join('\n')}`)
  }
  if (books.length) {
    const reading = books.filter((b: any) => b.status === 'reading')
    if (reading.length) {
      sections.push(`CURRENTLY READING:\n${reading.map((b: any) =>
        `- "${b.title}" by ${b.author}`
      ).join('\n')}`)
    }
  }

  return sections.join('\n\n')
}

const SYSTEM_PROMPT = `You are the LifeOS AI Assistant — a personal, empathetic, and insightful companion built into the user's life management platform.

You have access to the user's personal data from LifeOS including their journal entries, habits, tasks, goals, workouts, sleep, nutrition, expenses, reading list, and more.

YOUR ROLE:
- Answer questions about the user's data, patterns, and progress
- Provide personalized insights, encouragement, and actionable advice
- Help with goal planning, habit optimization, and self-reflection
- Be conversational, warm, and supportive
- Also answer general knowledge questions when asked

GUIDELINES:
- Reference specific data when available
- Be concise but thorough — no fluff
- If data is limited, say so honestly
- Never fabricate data — only reference what's provided
- Use markdown formatting for readability
- Keep responses focused and practical`

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
router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { message, apiKey, provider = 'openai', model } = req.body

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

    const key = apiKey || process.env.OPENAI_API_KEY
    if (!key) {
      return res.status(400).json({ error: 'No API key configured. Add your API key in the chat settings.' })
    }

    if (isDemoUser(userId)) {
      return res.status(400).json({ error: 'Chat is not available in demo mode' })
    }

    const history = await ChatMessage.find({ userId }).sort({ createdAt: -1 }).limit(20).lean()
    history.reverse()

    const userContext = await gatherUserContext(userId)
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

      res.write(`data: ${JSON.stringify({
        savedMessages: [
          { _id: savedUser._id, role: 'user', content: message, createdAt: savedUser.createdAt },
          { _id: savedAssistant._id, role: 'assistant', content: fullContent, createdAt: savedAssistant.createdAt },
        ]
      })}\n\n`)
      res.write('data: [DONE]\n\n')
    } catch (err) {
      console.error('Stream error:', err)
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
    await ChatMessage.deleteMany({ userId })
    return res.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/chat error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
