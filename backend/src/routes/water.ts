import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { WaterLog } from '../models/WaterLog'
import { DEMO_WATER_LOGS } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEMO_WATER_LOGS)
    const items = await WaterLog.find({ userId }).sort({ date: -1 }).limit(30)
    return res.json(items)
  } catch (e) {
    console.error('GET /api/water error:', e)
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
    const item = await WaterLog.findOneAndUpdate(
      { userId, date: (body as any).date },
      { ...body, userId },
      { new: true, upsert: true }
    )
    return res.json(item)
  } catch (e) {
    console.error('POST /api/water error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
