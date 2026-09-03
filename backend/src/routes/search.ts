import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { SearchService, SearchResultType } from '../lib/SearchService'

const router = Router()
router.use(authMiddleware)

const ALL_TYPES: SearchResultType[] = [
  'task', 'goal', 'note', 'journal', 'habit',
  'capture', 'bookmark', 'book', 'project',
]

/**
 * GET /api/search?q=&types=task,note&limit=30&skip=0
 *
 * Query params:
 *   q      – required, min 1 char after trim
 *   types  – comma-separated list of SearchResultType (default: all)
 *   limit  – default 30, max 100
 *   skip   – pagination offset (default 0)
 */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId

    // ── Validate q ─────────────────────────────────────────────────────────
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
    if (!q || q.length < 1) {
      return res.status(400).json({ error: 'q is required and must be non-empty' })
    }
    if (q.length > 200) {
      return res.status(400).json({ error: 'q must be ≤ 200 characters' })
    }

    // ── Validate types ──────────────────────────────────────────────────────
    let types: SearchResultType[] | undefined
    if (typeof req.query.types === 'string' && req.query.types.trim()) {
      const requested = req.query.types.split(',').map(t => t.trim()) as SearchResultType[]
      types = requested.filter(t => ALL_TYPES.includes(t))
      if (types.length === 0) {
        return res.status(400).json({ error: `types must be one or more of: ${ALL_TYPES.join(', ')}` })
      }
    }

    // ── Validate pagination ─────────────────────────────────────────────────
    const rawLimit = parseInt(req.query.limit as string, 10)
    const limit = isNaN(rawLimit) || rawLimit <= 0 ? 30 : Math.min(rawLimit, 100)

    const rawSkip = parseInt(req.query.skip as string, 10)
    const skip = isNaN(rawSkip) || rawSkip < 0 ? 0 : rawSkip

    // ── Execute — userId is always enforced inside SearchService ───────────
    const response = await SearchService.search({ q, types, limit, skip, userId })

    return res.json(response)
  } catch (e) {
    console.error('GET /api/search error:', e)
    return res.status(500).json({ error: 'Search failed' })
  }
})

export default router
