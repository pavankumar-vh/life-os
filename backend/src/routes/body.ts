import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { BodyLog } from '../models/BodyLog'
import { audit } from '../lib/audit'
import { DEMO_BODY_LOGS } from '../lib/demo-data'
import { asyncHandler } from '../middleware/asyncHandler'
import { isValidObjectId, isValidDate } from '../lib/utils'
import { ValidationError } from '../lib/errors'

const router = Router()
router.use(authMiddleware)

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  if (isDemoUser(userId)) return res.json(DEMO_BODY_LOGS)
  const logs = await BodyLog.find({ userId }).sort({ date: -1 }).limit(100)
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
  const log = await BodyLog.findOneAndUpdate(
    { userId, date: body.date },
    { ...body, userId },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  audit(userId, 'create', 'body', log._id, { after: log.toJSON() })
  return res.json(log)
}))

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const id = String(req.params.id)
  if (!isValidObjectId(id)) throw new ValidationError('Invalid body log ID')
  if (isDemoUser(userId)) return res.json({ success: true })
  const log = await BodyLog.findOne({ _id: id, userId })
  if (log) audit(userId, 'delete', 'body', id, { before: log.toJSON() })
  await BodyLog.findOneAndDelete({ _id: id, userId })
  return res.json({ success: true })
}))

export default router
