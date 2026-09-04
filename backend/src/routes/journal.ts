import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { JournalService } from '../services/JournalService'
import { asyncHandler } from '../middleware/asyncHandler'

const router = Router()
router.use(authMiddleware)

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const rawLimit = parseInt(req.query.limit as string, 10)
  const limit = isNaN(rawLimit) ? 100 : rawLimit
  const entries = await JournalService.getEntries(req.user!.userId, limit)
  return res.json(entries)
}))

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const entry = await JournalService.saveEntry(req.user!.userId, req.body)
  return res.json(entry)
}))

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  await JournalService.deleteEntry(req.user!.userId, String(req.params.id))
  return res.json({ success: true })
}))

export default router
