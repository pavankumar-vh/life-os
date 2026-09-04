import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { WorkoutService } from '../services/WorkoutService'
import { asyncHandler } from '../middleware/asyncHandler'

const router = Router()
router.use(authMiddleware)

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const workouts = await WorkoutService.getWorkouts(req.user!.userId)
  return res.json(workouts)
}))

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const workout = await WorkoutService.logWorkout(req.user!.userId, req.body)
  return res.status(201).json(workout)
}))

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const workout = await WorkoutService.updateWorkout(req.user!.userId, String(req.params.id), req.body)
  return res.json(workout)
}))

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  await WorkoutService.deleteWorkout(req.user!.userId, String(req.params.id))
  return res.json({ success: true })
}))

export default router
