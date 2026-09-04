import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { ProjectService } from '../services/ProjectService'
import { asyncHandler } from '../middleware/asyncHandler'

const router = Router()
router.use(authMiddleware)

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const projects = await ProjectService.getProjects(req.user!.userId)
  return res.json(projects)
}))

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const project = await ProjectService.createProject(req.user!.userId, req.body)
  return res.status(201).json(project)
}))

router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const project = await ProjectService.updateProject(req.user!.userId, String(req.params.id), req.body)
  return res.json(project)
}))

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  await ProjectService.deleteProject(req.user!.userId, String(req.params.id))
  return res.json({ success: true })
}))

export default router
