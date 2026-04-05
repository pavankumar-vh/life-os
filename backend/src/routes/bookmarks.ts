import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Bookmark } from '../models/Bookmark'
import { audit } from '../lib/audit'
import { DEMO_BOOKMARKS } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEMO_BOOKMARKS)
    const items = await Bookmark.find({ userId }).sort({ createdAt: -1 })
    return res.json(items)
  } catch (e) {
    console.error('GET /api/bookmarks error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const body = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      return res.json({ _id: `demo-${Date.now()}`, ...body, userId, createdAt: new Date().toISOString() })
    }
    const item = await Bookmark.create({ ...body, userId })
    audit(userId, 'create', 'bookmarks', item._id, { after: item.toJSON() })
    return res.status(201).json(item)
  } catch (e) {
    console.error('POST /api/bookmarks error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    const item = await Bookmark.findOne({ _id: id, userId })
    if (item) audit(userId, 'delete', 'bookmarks', id, { before: item.toJSON() })
    await Bookmark.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/bookmarks error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
