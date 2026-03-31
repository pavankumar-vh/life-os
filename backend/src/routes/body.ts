import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { BodyLog } from '../models/BodyLog'
import { DEMO_BODY_LOGS } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEMO_BODY_LOGS)
    const logs = await BodyLog.find({ userId }).sort({ date: -1 }).limit(100)
    return res.json(logs)
  } catch (e) {
    console.error('GET /api/body error:', e)
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
    const log = await BodyLog.findOneAndUpdate(
      { userId, date: (body as any).date },
      { ...body, userId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    return res.json(log)
  } catch (e) {
    console.error('POST /api/body error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
