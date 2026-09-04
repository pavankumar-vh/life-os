import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Book } from '../models/Book'
import { audit } from '../lib/audit'
import { DEMO_BOOKS } from '../lib/demo-data'
import { asyncHandler } from '../middleware/asyncHandler'
import { isValidObjectId } from '../lib/utils'
import { ValidationError, NotFoundError } from '../lib/errors'

const router = Router()
router.use(authMiddleware)

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  if (isDemoUser(userId)) return res.json(DEMO_BOOKS)
  const items = await Book.find({ userId }).sort({ createdAt: -1 }).limit(200)
  return res.json(items)
}))

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const body = sanitizeBody(req.body) as Record<string, unknown>
  if (!body.title || typeof body.title !== 'string' || !String(body.title).trim()) {
    throw new ValidationError('title is required')
  }
  if (isDemoUser(userId)) {
    return res.json({ _id: `demo-${Date.now()}`, ...body, userId })
  }
  const item = await Book.create({ ...body, userId })
  audit(userId, 'create', 'books', item._id, { after: item.toJSON() })
  return res.status(201).json(item)
}))

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const id = String(req.params.id)
  if (!isValidObjectId(id)) throw new ValidationError('Invalid book ID')
  const updates = sanitizeBody(req.body)
  if (isDemoUser(userId)) {
    const existing = DEMO_BOOKS.find(b => b._id === id)
    return res.json({ ...(existing || {}), ...updates, _id: id, userId })
  }
  const item = await Book.findOneAndUpdate({ _id: id, userId }, updates, { new: true })
  if (!item) throw new NotFoundError('Book not found')
  audit(userId, 'update', 'books', id, { after: item.toJSON(), changes: updates as Record<string, unknown> })
  return res.json(item)
}))

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const id = String(req.params.id)
  if (!isValidObjectId(id)) throw new ValidationError('Invalid book ID')
  if (isDemoUser(userId)) return res.json({ success: true })
  const item = await Book.findOne({ _id: id, userId })
  if (item) audit(userId, 'delete', 'books', id, { before: item.toJSON() })
  await Book.findOneAndDelete({ _id: id, userId })
  return res.json({ success: true })
}))

export default router
