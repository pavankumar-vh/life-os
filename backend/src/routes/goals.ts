import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { GoalService } from '../services/GoalService'
import { asyncHandler } from '../middleware/asyncHandler'

const router = Router()
router.use(authMiddleware)

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const goals = await GoalService.getGoals(req.user!.userId)
  return res.json(goals)
}))

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const goal = await GoalService.createGoal(req.user!.userId, req.body)
  return res.status(201).json(goal)
}))

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const goal = await GoalService.updateGoal(req.user!.userId, String(req.params.id), req.body)
  return res.json(goal)
}))

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  await GoalService.deleteGoal(req.user!.userId, String(req.params.id))
  return res.json({ success: true })
}))

export default router
