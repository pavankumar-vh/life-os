import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Book } from '../models/Book'
import { audit } from '../lib/audit'
import { DEMO_BOOKS } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEMO_BOOKS)
    const items = await Book.find({ userId }).sort({ createdAt: -1 })
    return res.json(items)
  } catch (e) {
    console.error('GET /api/books error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const body = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      return res.json({ _id: `demo-${Date.now()}`, ...body, userId })
    }
    const item = await Book.create({ ...body, userId })
    audit(userId, 'create', 'books', item._id, { after: item.toJSON() })
    return res.status(201).json(item)
  } catch (e) {
    console.error('POST /api/books error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const updates = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      const existing = DEMO_BOOKS.find(b => b._id === id)
      return res.json({ ...(existing || {}), ...updates, _id: id, userId })
    }
    const item = await Book.findOneAndUpdate({ _id: id, userId }, updates, { new: true })
    if (!item) return res.status(404).json({ error: 'Not found' })
    audit(userId, 'update', 'books', id, { after: item.toJSON(), changes: updates as Record<string, unknown> })
    return res.json(item)
  } catch (e) {
    console.error('PUT /api/books error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    const item = await Book.findOne({ _id: id, userId })
    if (item) audit(userId, 'delete', 'books', id, { before: item.toJSON() })
    await Book.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/books error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
