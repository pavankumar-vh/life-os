import { Router } from 'express'
import multer from 'multer'
import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Flashcard } from '../models/Flashcard'
import { audit } from '../lib/audit'
import { DEMO_FLASHCARDS } from '../lib/demo-data'
import { User } from '../models/User'

const router = Router()
router.use(authMiddleware)

// Multer: in-memory, max 10MB, allowed file types
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'text/csv',
    ]
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Unsupported file type. Upload PDF, DOCX, TXT, MD, or CSV.'))
  },
})

async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  const { mimetype, buffer } = file
  if (mimetype === 'application/pdf') {
    const data = await pdfParse(buffer)
    return data.text
  }
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  // text/plain, text/markdown, text/csv
  return buffer.toString('utf-8')
}

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEMO_FLASHCARDS)
    const items = await Flashcard.find({ userId }).sort({ nextReview: 1 })
    return res.json(items)
  } catch (e) {
    console.error('GET /api/flashcards error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const body = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      return res.json({ _id: `demo-${Date.now()}`, ...body, userId, timesReviewed: 0, timesCorrect: 0 })
    }
    const item = await Flashcard.create({ ...body, userId })
    audit(userId, 'create', 'flashcards', item._id, { after: item.toJSON() })
    return res.status(201).json(item)
  } catch (e) {
    console.error('POST /api/flashcards error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const updates = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      const existing = DEMO_FLASHCARDS.find(f => f._id === id)
      return res.json({ ...(existing || {}), ...updates, _id: id, userId })
    }
    const item = await Flashcard.findOneAndUpdate({ _id: id, userId }, updates, { new: true })
    if (!item) return res.status(404).json({ error: 'Not found' })
    audit(userId, 'update', 'flashcards', id, { after: item.toJSON(), changes: updates as Record<string, unknown> })
    return res.json(item)
  } catch (e) {
    console.error('PUT /api/flashcards error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    const item = await Flashcard.findOne({ _id: id, userId })
    if (item) audit(userId, 'delete', 'flashcards', id, { before: item.toJSON() })
    await Flashcard.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/flashcards error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/flashcards/generate — AI-generate flashcards from topic, content, or uploaded file
router.post('/generate', upload.array('files', 10), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) {
      return res.status(400).json({ error: 'AI generation is not available in demo mode' })
    }

    const { topic, content, deck, count = 10 } = req.body
    const files = (req.files as Express.Multer.File[]) || []

    if (!topic && !content && files.length === 0) {
      return res.status(400).json({ error: 'Provide a topic, content, or upload files' })
    }
    if (!deck || typeof deck !== 'string' || deck.length > 100) {
      return res.status(400).json({ error: 'Provide a valid deck name' })
    }
    const cardCount = Math.min(Math.max(Number(count) || 10, 1), 30)

    const user = await User.findById(userId).select('settings.aiKeys').lean()
    const key = (user?.settings as any)?.aiKeys?.gemini || process.env.GEMINI_API_KEY
    if (!key) {
      return res.status(400).json({ error: 'No Gemini API key configured. Add your key in Settings.' })
    }

    // Build input text from files, pasted content, or topic
    let sourceText = ''
    for (const file of files) {
      try {
        const text = await extractTextFromFile(file)
        sourceText += (sourceText ? '\n\n--- ' + file.originalname + ' ---\n\n' : '') + text
      } catch (e) {
        console.error('File extraction error:', file.originalname, e)
        return res.status(400).json({ error: `Failed to extract text from ${file.originalname}` })
      }
    }
    if (content) sourceText += (sourceText ? '\n\n' : '') + String(content)

    const systemPrompt = `You are a flashcard generator. Generate flashcards as a JSON array. Each flashcard must have:
- "front": a clear, specific question (not too long)
- "back": a concise, accurate answer
- "difficulty": one of "easy", "medium", or "hard"

Rules:
- Cover the content comprehensively — don't skip sections
- Mix difficulty levels appropriately
- Questions should test understanding, not just recall
- Keep answers concise but complete
- Return ONLY the JSON array, no markdown fencing, no explanation

Example format:
[{"front":"What is X?","back":"X is...","difficulty":"medium"}]`

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`

    // Helper: call Gemini for one chunk
    async function generateFromChunk(chunkText: string, numCards: number): Promise<{ front: string; back: string; difficulty: string }[]> {
      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: chunkText }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 8000 },
        }),
      })
      if (!geminiRes.ok) {
        const errText = await geminiRes.text()
        console.error('Gemini API error:', errText)
        throw new Error('AI generation failed')
      }
      const data = await geminiRes.json() as any
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      const jsonMatch = rawText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) return []
      try {
        const parsed = JSON.parse(jsonMatch[0])
        return Array.isArray(parsed) ? parsed.filter((c: any) => c.front && c.back) : []
      } catch {
        return []
      }
    }

    let allGenerated: { front: string; back: string; difficulty: string }[] = []

    if (!sourceText) {
      // Topic-only mode — single call
      const prompt = `Generate exactly ${cardCount} flashcards about the topic: "${String(topic).slice(0, 500)}"`
      allGenerated = await generateFromChunk(prompt, cardCount)
    } else {
      // Chunk source text for large docs — ~80K chars per chunk (~20K tokens)
      const CHUNK_SIZE = 80000
      const chunks: string[] = []
      for (let i = 0; i < sourceText.length; i += CHUNK_SIZE) {
        chunks.push(sourceText.slice(i, i + CHUNK_SIZE))
      }

      // Distribute cards across chunks proportionally
      const cardsPerChunk = chunks.map((chunk, i) => {
        const proportion = chunk.length / sourceText.length
        const base = Math.max(1, Math.round(cardCount * proportion))
        // Last chunk gets remainder
        if (i === chunks.length - 1) {
          const assigned = chunks.slice(0, -1).reduce((s, _, j) => s + Math.max(1, Math.round(cardCount * (chunks[j].length / sourceText.length))), 0)
          return Math.max(1, cardCount - assigned)
        }
        return base
      })

      // Process chunks (sequentially to respect rate limits)
      for (let i = 0; i < chunks.length; i++) {
        const n = cardsPerChunk[i]
        const prompt = `Based on the following content (part ${i + 1} of ${chunks.length}), generate exactly ${n} flashcards:\n\n${chunks[i]}`
        try {
          const result = await generateFromChunk(prompt, n)
          allGenerated.push(...result)
        } catch (e) {
          console.error(`Chunk ${i + 1}/${chunks.length} failed:`, e)
          // Continue with other chunks
        }
      }
    }

    if (allGenerated.length === 0) {
      return res.status(502).json({ error: 'AI returned no flashcards. Try again.' })
    }

    const today = new Date().toISOString().slice(0, 10)
    const validDifficulties = ['easy', 'medium', 'hard']
    const cards = allGenerated
      .slice(0, cardCount)
      .map(c => ({
        userId,
        deck: String(deck).trim(),
        front: String(c.front).trim().slice(0, 1000),
        back: String(c.back).trim().slice(0, 2000),
        difficulty: validDifficulties.includes(c.difficulty) ? c.difficulty : 'medium',
        nextReview: today,
        timesReviewed: 0,
        timesCorrect: 0,
      }))

    const saved = await Flashcard.insertMany(cards)
    return res.status(201).json(saved)
  } catch (e) {
    console.error('POST /api/flashcards/generate error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
