import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Flashcard } from '../models/Flashcard'
import { DEMO_FLASHCARDS } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

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
    await Flashcard.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/flashcards error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
