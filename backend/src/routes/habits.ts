import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Habit } from '../models/Habit'
import { DEMO_HABITS } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEMO_HABITS)
    const habits = await Habit.find({ userId }).sort({ createdAt: -1 })
    return res.json(habits)
  } catch (e) {
    console.error('GET /api/habits error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const body = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      return res.status(201).json({ _id: `demo-${Date.now()}`, ...body, userId, completedDates: [], streak: 0, bestStreak: 0 })
    }
    const habit = await Habit.create({ ...body, userId })
    return res.status(201).json(habit)
  } catch (e) {
    console.error('POST /api/habits error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const updates = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      return res.json({ _id: id, ...updates, userId })
    }
    const habit = await Habit.findOneAndUpdate({ _id: id, userId }, updates, { new: true })
    if (!habit) return res.status(404).json({ error: 'Not found' })
    return res.json(habit)
  } catch (e) {
    console.error('PUT /api/habits error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    await Habit.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/habits error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
