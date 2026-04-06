import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { FocusSession } from '../models/FocusSession'
import { audit } from '../lib/audit'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json([])
    const sessions = await FocusSession.find({ userId }).sort({ completedAt: -1 }).limit(100)
    return res.json(sessions)
  } catch (e) {
    console.error('GET /api/focus error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const body = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      return res.json({ _id: `demo-${Date.now()}`, ...body, userId, completedAt: new Date().toISOString(), createdAt: new Date().toISOString() })
    }
    const session = await FocusSession.create({ ...body, userId })
    audit(userId, 'create', 'focus', session._id, { after: session.toJSON() })
    return res.status(201).json(session)
  } catch (e) {
    console.error('POST /api/focus error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    const session = await FocusSession.findOne({ _id: id, userId })
    if (session) audit(userId, 'delete', 'focus', id, { before: session.toJSON() })
    await FocusSession.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/focus error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
