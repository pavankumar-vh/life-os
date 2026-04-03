import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Goal } from '../models/Goal'
import { User } from '../models/User'
import { DEMO_GOALS } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEMO_GOALS)
    const goals = await Goal.find({ userId }).sort({ createdAt: -1 })
    return res.json(goals)
  } catch (e) {
    console.error('GET /api/goals error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const body = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      return res.status(201).json({ _id: `demo-${Date.now()}`, ...body, userId, progress: 0, status: 'active' })
    }
    const goal = await Goal.create({ ...body, userId })
    return res.status(201).json(goal)
  } catch (e) {
    console.error('POST /api/goals error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const updates = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      const existing = DEMO_GOALS.find(g => g._id === id)
      return res.json({ ...(existing || {}), ...updates, _id: id, userId })
    }
    const goal = await Goal.findOneAndUpdate({ _id: id, userId }, updates, { new: true })
    if (!goal) return res.status(404).json({ error: 'Not found' })
    // Award XP atomically: only if we're the one transitioning to completed
    if ((updates as any).status === 'completed') {
      const xpResult = await Goal.findOneAndUpdate(
        { _id: id, userId, _xpAwarded: { $ne: true } },
        { $set: { _xpAwarded: true } }
      )
      if (xpResult) await User.findByIdAndUpdate(userId, { $inc: { xp: 50 } })
    }
    return res.json(goal)
  } catch (e) {
    console.error('PUT /api/goals error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    await Goal.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/goals error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
