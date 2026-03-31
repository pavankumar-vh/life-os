import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Journal } from '../models/Journal'
import { DEMO_JOURNAL } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEMO_JOURNAL)
    const entries = await Journal.find({ userId }).sort({ date: -1 }).limit(100)
    return res.json(entries)
  } catch (e) {
    console.error('GET /api/journal error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const bodyId = req.body._id
    const body = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      return res.json({ _id: bodyId || `demo-${Date.now()}`, ...body, userId })
    }
    const entry = await Journal.findOneAndUpdate(
      { userId, date: (body as any).date },
      { ...body, userId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    return res.json(entry)
  } catch (e) {
    console.error('POST /api/journal error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    await Journal.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/journal error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
