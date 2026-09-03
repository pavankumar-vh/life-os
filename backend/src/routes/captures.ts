import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Capture, CaptureSource, CaptureType } from '../models/Capture'
import { audit } from '../lib/audit'
import { DEMO_CAPTURES } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

const VALID_SOURCES: CaptureSource[] = ['manual', 'api', 'import', 'automation', 'future_mcp', 'future_agent']
const VALID_TYPES: CaptureType[] = ['thought', 'idea', 'todo', 'reminder']

/** GET /api/captures
 *  Query params:
 *    q        – full-text search
 *    type     – filter by type
 *    source   – filter by source
 *    processed – 'true' | 'false'
 *    limit    – default 200, max 500
 *    skip     – offset for pagination
 */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEMO_CAPTURES)

    const { q, type, source, processed, limit = '200', skip = '0' } = req.query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { userId }

    if (q && typeof q === 'string' && q.trim()) {
      filter.$text = { $search: q.trim() }
    }
    if (type && VALID_TYPES.includes(type as CaptureType)) filter.type = type
    if (source && VALID_SOURCES.includes(source as CaptureSource)) filter.source = source
    if (processed === 'true') filter.processed = true
    if (processed === 'false') filter.processed = false

    const maxLimit = Math.min(parseInt(limit as string, 10) || 200, 500)
    const skipNum = parseInt(skip as string, 10) || 0

    const items = await Capture.find(filter)
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(maxLimit)

    return res.json(items)
  } catch (e) {
    console.error('GET /api/captures error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

/** POST /api/captures */
router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const body = sanitizeBody(req.body) as Record<string, unknown>

    // Validate required field
    if (!body.text || typeof body.text !== 'string' || !(body.text as string).trim()) {
      return res.status(400).json({ error: 'text is required' })
    }

    // Sanitize/default source
    const source: CaptureSource = VALID_SOURCES.includes(body.source as CaptureSource)
      ? (body.source as CaptureSource)
      : 'manual'

    // Sanitize/default type
    const type: CaptureType = VALID_TYPES.includes(body.type as CaptureType)
      ? (body.type as CaptureType)
      : 'thought'

    // Sanitize tags
    const rawTags = Array.isArray(body.tags) ? body.tags : []
    const tags: string[] = rawTags
      .filter((t): t is string => typeof t === 'string')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0 && t.length <= 50)
      .slice(0, 10) // max 10 tags per capture

    const payload = {
      text: (body.text as string).trim(),
      type,
      source,
      tags,
      processed: false,
    }

    if (isDemoUser(userId)) {
      return res.json({ _id: `demo-${Date.now()}`, ...payload, userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    }

    const item = await Capture.create({ ...payload, userId })
    audit(userId, 'create', 'captures', item._id, {
      after: item.toJSON(),
      eventType: 'capture.created',
      source: source as any, // maps cleanly to ActivitySource
      metadata: { type: item.type, tags: item.tags },
    })
    return res.status(201).json(item)
  } catch (e) {
    console.error('POST /api/captures error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

/** PUT /api/captures/:id */
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const body = sanitizeBody(req.body) as Record<string, unknown>

    // Only allow these fields to be updated
    const allowedUpdates: Record<string, unknown> = {}
    if (typeof body.processed === 'boolean') allowedUpdates.processed = body.processed
    if (typeof body.text === 'string' && body.text.trim()) allowedUpdates.text = (body.text as string).trim()
    if (VALID_TYPES.includes(body.type as CaptureType)) allowedUpdates.type = body.type
    if (Array.isArray(body.tags)) {
      allowedUpdates.tags = (body.tags as unknown[])
        .filter((t): t is string => typeof t === 'string')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0)
        .slice(0, 10)
    }

    if (isDemoUser(userId)) {
      const existing = DEMO_CAPTURES.find(c => c._id === id) || {}
      return res.json({ ...existing, ...allowedUpdates, _id: id, userId })
    }

    const before = await Capture.findOne({ _id: id, userId })
    const item = await Capture.findOneAndUpdate({ _id: id, userId }, allowedUpdates, { new: true })
    if (!item) return res.status(404).json({ error: 'Not found' })
    const wasProcessed = allowedUpdates.processed === true && before?.processed !== true
    audit(userId, 'update', 'captures', id, {
      before: before?.toJSON(),
      after: item.toJSON(),
      changes: allowedUpdates,
      eventType: wasProcessed ? 'capture.processed' : 'generic.update',
      source: 'manual',
      metadata: { type: item.type },
    })
    return res.json(item)
  } catch (e) {
    console.error('PUT /api/captures error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

/** DELETE /api/captures/:id */
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    const item = await Capture.findOne({ _id: id, userId })
    if (item) {
      audit(userId, 'delete', 'captures', id, {
        before: item.toJSON(),
        eventType: 'capture.deleted',
        source: 'manual',
        metadata: { type: item.type },
      })
    }
    await Capture.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/captures error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
