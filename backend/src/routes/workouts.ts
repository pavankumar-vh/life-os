import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Workout } from '../models/Workout'
import { User } from '../models/User'
import { DEMO_WORKOUTS } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEMO_WORKOUTS)
    const workouts = await Workout.find({ userId }).sort({ date: -1 }).limit(100)
    return res.json(workouts)
  } catch (e) {
    console.error('GET /api/workouts error:', e)
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
    const workout = await Workout.create({ ...body, userId })
    if (workout) {
      await User.findByIdAndUpdate(userId, { $inc: { xp: 25 } })
    }
    return res.status(201).json(workout)
  } catch (e) {
    console.error('POST /api/workouts error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const updates = sanitizeBody(req.body)
    if (isDemoUser(userId)) return res.json({ _id: id, ...updates, userId })
    const workout = await Workout.findOneAndUpdate({ _id: id, userId }, updates, { new: true })
    if (!workout) return res.status(404).json({ error: 'Not found' })
    return res.json(workout)
  } catch (e) {
    console.error('PUT /api/workouts error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    await Workout.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/workouts error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
