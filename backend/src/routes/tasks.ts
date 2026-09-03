import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { TaskService } from '../services/TaskService'
import { asyncHandler } from '../middleware/asyncHandler'

const router = Router()
router.use(authMiddleware)

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const tasks = await TaskService.getTasks(userId)
  return res.json(tasks)
}))

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const task = await TaskService.createTask(userId, req.body)
  return res.status(201).json(task)
}))

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const task = await TaskService.updateTask(userId, req.params.id, req.body)
  return res.json(task)
}))

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  await TaskService.deleteTask(userId, req.params.id)
  return res.json({ success: true })
}))

export default router
