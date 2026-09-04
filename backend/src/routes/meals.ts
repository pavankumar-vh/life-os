import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Meal } from '../models/Meal'
import { audit } from '../lib/audit'
import { DEMO_MEALS } from '../lib/demo-data'
import { asyncHandler } from '../middleware/asyncHandler'
import { isValidObjectId, isValidDate } from '../lib/utils'
import { ValidationError, NotFoundError } from '../lib/errors'

const router = Router()
router.use(authMiddleware)

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  if (isDemoUser(userId)) {
    const date = req.query.date as string | undefined
    return res.json(date ? DEMO_MEALS.filter(m => m.date === date) : DEMO_MEALS)
  }
  const query: Record<string, string> = { userId }
  const date = req.query.date as string | undefined
  if (date) {
    if (!isValidDate(date)) throw new ValidationError('date must be in YYYY-MM-DD format')
    query.date = date
  }
  const meals = await Meal.find(query).sort({ createdAt: -1 }).limit(100)
  return res.json(meals)
}))

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const body = sanitizeBody(req.body) as Record<string, unknown>
  if (isDemoUser(userId)) {
    return res.status(201).json({ _id: `demo-${Date.now()}`, ...body, userId })
  }
  const meal = await Meal.create({ ...body, userId })
  audit(userId, 'create', 'meals', meal._id, { after: meal.toJSON() })
  return res.status(201).json(meal)
}))

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const id = String(req.params.id)
  if (!isValidObjectId(id)) throw new ValidationError('Invalid meal ID')
  const updates = sanitizeBody(req.body)
  if (isDemoUser(userId)) {
    const existing = DEMO_MEALS.find(m => m._id === id)
    return res.json({ ...(existing || {}), ...updates, _id: id, userId })
  }
  const meal = await Meal.findOneAndUpdate({ _id: id, userId }, updates, { new: true })
  if (!meal) throw new NotFoundError('Meal not found')
  audit(userId, 'update', 'meals', id, { after: meal.toJSON(), changes: updates as Record<string, unknown> })
  return res.json(meal)
}))

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const id = String(req.params.id)
  if (!isValidObjectId(id)) throw new ValidationError('Invalid meal ID')
  if (isDemoUser(userId)) return res.json({ success: true })
  const meal = await Meal.findOne({ _id: id, userId })
  if (meal) audit(userId, 'delete', 'meals', id, { before: meal.toJSON() })
  await Meal.findOneAndDelete({ _id: id, userId })
  return res.json({ success: true })
}))

export default router
