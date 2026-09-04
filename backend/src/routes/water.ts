import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { WaterLog } from '../models/WaterLog'
import { audit } from '../lib/audit'
import { DEMO_WATER_LOGS } from '../lib/demo-data'
import { asyncHandler } from '../middleware/asyncHandler'
import { isValidDate } from '../lib/utils'
import { ValidationError } from '../lib/errors'

const router = Router()
router.use(authMiddleware)

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  if (isDemoUser(userId)) return res.json(DEMO_WATER_LOGS)
  const items = await WaterLog.find({ userId }).sort({ date: -1 }).limit(30)
  return res.json(items)
}))

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const body = sanitizeBody(req.body) as Record<string, unknown>
  if (body.date && !isValidDate(String(body.date))) {
    throw new ValidationError('date must be in YYYY-MM-DD format')
  }
  if (isDemoUser(userId)) {
    return res.json({ _id: `demo-${Date.now()}`, ...body, userId })
  }
  const item = await WaterLog.findOneAndUpdate(
    { userId, date: body.date },
    { ...body, userId },
    { new: true, upsert: true }
  )
  audit(userId, 'create', 'water', item._id, { after: item.toJSON() })
  return res.json(item)
}))

export default router
