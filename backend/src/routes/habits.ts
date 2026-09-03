import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { HabitService } from '../services/HabitService'
import { asyncHandler } from '../middleware/asyncHandler'

const router = Router()
router.use(authMiddleware)

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const habits = await HabitService.getHabits(userId)
  return res.json(habits)
}))

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const habit = await HabitService.createHabit(userId, req.body)
  return res.status(201).json(habit)
}))

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const habit = await HabitService.updateHabit(userId, req.params.id, req.body)
  return res.json(habit)
}))

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  await HabitService.deleteHabit(userId, req.params.id)
  return res.json({ success: true })
}))

router.post('/:id/log', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const { date } = req.body
  const habit = await HabitService.logCompletion(userId, req.params.id, date)
  return res.json(habit)
}))

router.post('/:id/unlog', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const { date } = req.body
  const habit = await HabitService.unlogCompletion(userId, req.params.id, date)
  return res.json(habit)
}))

export default router
