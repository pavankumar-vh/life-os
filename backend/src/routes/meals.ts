import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Meal } from '../models/Meal'
import { audit } from '../lib/audit'
import { DEMO_MEALS } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) {
      const date = req.query.date as string | undefined
      return res.json(date ? DEMO_MEALS.filter((m) => m.date === date) : DEMO_MEALS)
    }
    const query: Record<string, string> = { userId }
    const date = req.query.date as string | undefined
    if (date) query.date = date
    const meals = await Meal.find(query).sort({ createdAt: -1 }).limit(100)
    return res.json(meals)
  } catch (e) {
    console.error('GET /api/meals error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const body = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      return res.status(201).json({ _id: `demo-${Date.now()}`, ...body, userId })
    }
    const meal = await Meal.create({ ...body, userId })
    audit(userId, 'create', 'meals', meal._id, { after: meal.toJSON() })
    return res.status(201).json(meal)
  } catch (e) {
    console.error('POST /api/meals error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    const meal = await Meal.findOne({ _id: id, userId })
    if (meal) audit(userId, 'delete', 'meals', id, { before: meal.toJSON() })
    await Meal.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/meals error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
