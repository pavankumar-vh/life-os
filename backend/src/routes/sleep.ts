import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { SleepLog } from '../models/SleepLog'
import { audit } from '../lib/audit'
import { DEMO_SLEEP_LOGS } from '../lib/demo-data'
import { asyncHandler } from '../middleware/asyncHandler'
import { isValidDate } from '../lib/utils'
import { ValidationError } from '../lib/errors'

const router = Router()
router.use(authMiddleware)

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  if (isDemoUser(userId)) return res.json(DEMO_SLEEP_LOGS)
  const logs = await SleepLog.find({ userId }).sort({ date: -1 }).limit(100)
  return res.json(logs)
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const log = await SleepLog.findOneAndUpdate(
    { userId, date: body.date },
    { ...body, userId },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  audit(userId, 'create', 'sleep', log._id, { after: log.toJSON() })
  return res.json(log)
}))

export default router
