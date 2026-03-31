import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Task } from '../models/Task'
import { User } from '../models/User'
import { DEMO_TASKS } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEMO_TASKS)
    const tasks = await Task.find({ userId }).sort({ createdAt: -1 })
    return res.json(tasks)
  } catch (e) {
    console.error('GET /api/tasks error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const body = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      return res.status(201).json({ _id: `demo-${Date.now()}`, ...body, userId, status: 'todo' })
    }
    const task = await Task.create({ ...body, userId })
    return res.status(201).json(task)
  } catch (e) {
    console.error('POST /api/tasks error:', e)
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
    const prevTask = await Task.findOne({ _id: id, userId })
    const task = await Task.findOneAndUpdate({ _id: id, userId }, updates, { new: true })
    if (!task) return res.status(404).json({ error: 'Not found' })
    // Award XP when task marked as done
    if (prevTask && prevTask.status !== 'done' && task.status === 'done') {
      await User.findByIdAndUpdate(userId, { $inc: { xp: 15 } })
    }
    return res.json(task)
  } catch (e) {
    console.error('PUT /api/tasks error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    await Task.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/tasks error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
