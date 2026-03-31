import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Expense } from '../models/Expense'
import { DEMO_EXPENSES } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEMO_EXPENSES)
    const items = await Expense.find({ userId }).sort({ date: -1 })
    return res.json(items)
  } catch (e) {
    console.error('GET /api/expenses error:', e)
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
    const item = await Expense.create({ ...body, userId })
    return res.status(201).json(item)
  } catch (e) {
    console.error('POST /api/expenses error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    await Expense.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/expenses error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
