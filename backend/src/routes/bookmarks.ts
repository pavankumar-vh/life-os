import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Bookmark } from '../models/Bookmark'
import { audit } from '../lib/audit'
import { DEMO_BOOKMARKS } from '../lib/demo-data'
import { asyncHandler } from '../middleware/asyncHandler'
import { isValidObjectId } from '../lib/utils'
import { ValidationError, NotFoundError } from '../lib/errors'

const router = Router()
router.use(authMiddleware)

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  if (isDemoUser(userId)) return res.json(DEMO_BOOKMARKS)
  const items = await Bookmark.find({ userId }).sort({ createdAt: -1 }).limit(200)
  return res.json(items)
}))

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const body = sanitizeBody(req.body) as Record<string, unknown>
  if (!body.url || typeof body.url !== 'string' || !body.url.trim()) {
    throw new ValidationError('url is required')
  }
  if (isDemoUser(userId)) {
    return res.json({ _id: `demo-${Date.now()}`, ...body, userId, createdAt: new Date().toISOString() })
  }
  const item = await Bookmark.create({ ...body, userId })
  audit(userId, 'create', 'bookmarks', item._id, { after: item.toJSON() })
  return res.status(201).json(item)
}))

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const id = String(req.params.id)
  if (!isValidObjectId(id)) throw new ValidationError('Invalid bookmark ID')
  const updates = sanitizeBody(req.body)
  if (isDemoUser(userId)) {
    const existing = DEMO_BOOKMARKS.find(b => b._id === id)
    return res.json(Object.assign({}, existing || {}, updates, { _id: id, userId }))
  }
  const item = await Bookmark.findOneAndUpdate({ _id: id, userId }, updates, { new: true })
  if (!item) throw new NotFoundError('Bookmark not found')
  audit(userId, 'update', 'bookmarks', id, { after: item.toJSON(), changes: updates as Record<string, unknown> })
  return res.json(item)
}))

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const id = String(req.params.id)
  if (!isValidObjectId(id)) throw new ValidationError('Invalid bookmark ID')
  if (isDemoUser(userId)) return res.json({ success: true })
  const item = await Bookmark.findOne({ _id: id, userId })
  if (item) audit(userId, 'delete', 'bookmarks', id, { before: item.toJSON() })
  await Bookmark.findOneAndDelete({ _id: id, userId })
  return res.json({ success: true })
}))

export default router
