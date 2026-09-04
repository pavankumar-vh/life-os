import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { AuditLog } from '../models/AuditLog'

const router = Router()
router.use(authMiddleware)

/**
 * GET /api/activity
 * Returns a unified timeline of semantic actions across all Life OS modules.
 * Only returns logs that have an `eventType` (meaning they were enriched by feat/activity-foundation).
 * 
 * Query params:
 *   limit: default 50, max 200
 *   skip: offset for pagination
 */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) {
      // Return empty array for demo user for now, or we could generate dummy activity.
      return res.json([])
    }

    const { limit = '50', skip = '0' } = req.query
    const maxLimit = Math.min(parseInt(limit as string, 10) || 50, 200)
    const skipNum = parseInt(skip as string, 10) || 0

    // Only fetch enriched activity logs (eventType != null)
    const activities = await AuditLog.find({ 
      userId,
      eventType: { $ne: null }
    })
      .sort({ timestamp: -1 })
      .skip(skipNum)
      .limit(maxLimit)
      .select('eventType source metadata timestamp collectionName documentId')

    return res.json(activities)
  } catch (e) {
    console.error('GET /api/activity error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
