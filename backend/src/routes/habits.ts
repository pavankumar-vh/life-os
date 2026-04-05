import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Habit } from '../models/Habit'
import { audit } from '../lib/audit'
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
    audit(userId, 'create', 'habits', habit._id, { after: habit.toJSON() })
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
      const existing = DEMO_HABITS.find(h => h._id === id)
      return res.json({ ...(existing || {}), ...updates, _id: id, userId })
    }
    const habit = await Habit.findOneAndUpdate({ _id: id, userId }, updates, { new: true })
    if (!habit) return res.status(404).json({ error: 'Not found' })
    audit(userId, 'update', 'habits', id, { after: habit.toJSON(), changes: updates as Record<string, unknown> })
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
    const habit = await Habit.findOne({ _id: id, userId })
    if (habit) audit(userId, 'delete', 'habits', id, { before: habit.toJSON() })
    await Habit.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/habits error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/habits/:id/toggle — toggle a habit completion for a date
router.patch('/:id/toggle', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const { date } = req.body
    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date required' })
    }
    if (isDemoUser(userId)) {
      const habit = DEMO_HABITS.find(h => h._id === id)
      if (!habit) return res.status(404).json({ error: 'Not found' })
      const idx = habit.completedDates.indexOf(date)
      if (idx >= 0) {
        habit.completedDates.splice(idx, 1)
      } else {
        habit.completedDates.push(date)
      }
      return res.json({ ...habit })
    }
    const habit = await Habit.findOne({ _id: id, userId })
    if (!habit) return res.status(404).json({ error: 'Not found' })

    const idx = habit.completedDates.indexOf(date)
    if (idx >= 0) {
      habit.completedDates.splice(idx, 1)
    } else {
      habit.completedDates.push(date)
    }

    // Recalculate streak
    const today = new Date()
    const sorted = [...habit.completedDates].sort().reverse()
    let streak = 0
    for (let i = 0; i < sorted.length; i++) {
      const expected = new Date(today)
      expected.setDate(expected.getDate() - i)
      const expectedStr = expected.toISOString().split('T')[0]
      if (sorted[i] === expectedStr) {
        streak++
      } else {
        break
      }
    }
    habit.streak = streak
    if (streak > habit.bestStreak) habit.bestStreak = streak

    await habit.save()
    audit(userId, 'update', 'habits', id, { after: habit.toJSON(), changes: { toggledDate: date } })
    return res.json(habit)
  } catch (e) {
    console.error('PATCH /api/habits/:id/toggle error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
