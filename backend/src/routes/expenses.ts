import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Expense } from '../models/Expense'
import { audit } from '../lib/audit'
import { DEMO_EXPENSES } from '../lib/demo-data'
import { asyncHandler } from '../middleware/asyncHandler'
import { isValidObjectId, isValidDate } from '../lib/utils'
import { ValidationError, NotFoundError } from '../lib/errors'

const router = Router()
router.use(authMiddleware)

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  if (isDemoUser(userId)) return res.json(DEMO_EXPENSES)
  // Support optional date range filtering
  const filter: Record<string, unknown> = { userId }
  if (req.query.from && isValidDate(req.query.from as string)) {
    filter.date = { ...filter.date as object, $gte: req.query.from }
  }
  if (req.query.to && isValidDate(req.query.to as string)) {
    filter.date = { ...filter.date as object, $lte: req.query.to }
  }
  const items = await Expense.find(filter).sort({ date: -1 }).limit(500)
  return res.json(items)
}))

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const body = sanitizeBody(req.body) as Record<string, unknown>

  if (!body.amount || typeof body.amount !== 'number' || !isFinite(body.amount as number)) {
    throw new ValidationError('amount is required and must be a number')
  }
  if (body.date && !isValidDate(String(body.date))) {
    throw new ValidationError('date must be in YYYY-MM-DD format')
  }

  if (isDemoUser(userId)) {
    return res.status(201).json({ _id: `demo-${Date.now()}`, ...body, userId })
  }

  const item = await Expense.create({ ...body, userId })
  audit(userId, 'create', 'expenses', item._id, {
    after: item.toJSON(),
    eventType: 'expense.logged',
    source: 'manual',
    metadata: { description: item.description, amount: item.amount, category: item.category },
  })
  return res.status(201).json(item)
}))

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const id = String(req.params.id)
  if (!isValidObjectId(id)) throw new ValidationError('Invalid expense ID')
  const updates = sanitizeBody(req.body) as Record<string, unknown>
  if (updates.amount !== undefined && (typeof updates.amount !== 'number' || !isFinite(updates.amount as number))) {
    throw new ValidationError('amount must be a number')
  }

  if (isDemoUser(userId)) {
    const existing = DEMO_EXPENSES.find(e => e._id === id)
    return res.json({ ...(existing || {}), ...updates, _id: id, userId })
  }

  const item = await Expense.findOneAndUpdate({ _id: id, userId }, updates, { new: true })
  if (!item) throw new NotFoundError('Expense not found')
  audit(userId, 'update', 'expenses', id, {
    after: item.toJSON(),
    changes: updates as Record<string, unknown>
  })
  return res.json(item)
}))

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const id = String(req.params.id)
  if (!isValidObjectId(id)) throw new ValidationError('Invalid expense ID')
  if (isDemoUser(userId)) return res.json({ success: true })

  const item = await Expense.findOne({ _id: id, userId })
  if (item) {
    audit(userId, 'delete', 'expenses', id, {
      before: item.toJSON(),
      eventType: 'expense.deleted',
      source: 'manual',
      metadata: { description: item.description, amount: item.amount },
    })
  }
  await Expense.findOneAndDelete({ _id: id, userId })
  return res.json({ success: true })
}))

export default router
