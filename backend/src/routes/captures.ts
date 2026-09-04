import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { CaptureService } from '../services/CaptureService'
import { asyncHandler } from '../middleware/asyncHandler'

const router = Router()
router.use(authMiddleware)

/**
 * GET /api/captures
 *  q        – full-text search
 *  type     – filter by type
 *  source   – filter by source
 *  processed – 'true' | 'false'
 *  limit    – default 100, max 500
 *  skip     – offset for pagination
 */
router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const { q, type, source, processed, limit, skip } = req.query
  const items = await CaptureService.getCaptures(req.user!.userId, {
    q: q as string,
    type: type as string,
    source: source as string,
    processed: processed as string,
    limit: limit ? parseInt(limit as string, 10) : 100,
    skip: skip ? parseInt(skip as string, 10) : 0,
  })
  return res.json(items)
}))

/** POST /api/captures */
router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const item = await CaptureService.createCapture(req.user!.userId, req.body)
  return res.status(201).json(item)
}))

/** PUT /api/captures/:id */
router.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const item = await CaptureService.updateCapture(req.user!.userId, String(req.params.id), req.body)
  return res.json(item)
}))

/** DELETE /api/captures/:id */
router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  await CaptureService.deleteCapture(req.user!.userId, String(req.params.id))
  return res.json({ success: true })
}))

export default router
