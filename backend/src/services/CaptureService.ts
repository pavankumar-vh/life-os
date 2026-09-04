import { Capture, ICapture, CaptureSource, CaptureType } from '../models/Capture'
import { audit } from '../lib/audit'
import { NotFoundError, ValidationError } from '../lib/errors'
import { DEMO_CAPTURES } from '../lib/demo-data'
import { isDemoUser } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { isValidObjectId } from '../lib/utils'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const VALID_CAPTURE_SOURCES: CaptureSource[] = [
  'manual', 'api', 'import', 'automation', 'mcp', 'future_mcp', 'future_agent'
]
export const VALID_CAPTURE_TYPES: CaptureType[] = ['thought', 'idea', 'todo', 'reminder']

const MAX_TAGS = 10
const MAX_TAG_LENGTH = 50
const MAX_TEXT_LENGTH = 10000

// ─── Query shape ──────────────────────────────────────────────────────────────

export interface CaptureQuery {
  q?: string
  type?: string
  source?: string
  processed?: string
  limit?: number
  skip?: number
}

// ─── CaptureService ───────────────────────────────────────────────────────────

export class CaptureService {
  /**
   * Fetch captures with optional filtering. ALWAYS scoped to userId.
   * Default limit 100, max 500.
   */
  static async getCaptures(userId: string, query: CaptureQuery = {}) {
    if (isDemoUser(userId)) return DEMO_CAPTURES

    const { q, type, source, processed, limit = 100, skip = 0 } = query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { userId }

    if (q && typeof q === 'string' && q.trim()) {
      filter.$text = { $search: q.trim() }
    }
    if (type && VALID_CAPTURE_TYPES.includes(type as CaptureType)) filter.type = type
    if (source && VALID_CAPTURE_SOURCES.includes(source as CaptureSource)) filter.source = source
    if (processed === 'true') filter.processed = true
    if (processed === 'false') filter.processed = false

    const maxLimit = Math.min(Math.max(1, Number(limit) || 100), 500)
    const skipNum = Math.max(0, Number(skip) || 0)

    return Capture.find(filter)
      .sort({ createdAt: -1 })
      .skip(skipNum)
      .limit(maxLimit)
      .lean()
  }

  /**
   * Create a capture. Validates text, sanitizes tags and enums.
   */
  static async createCapture(userId: string, rawData: Partial<ICapture> & { text?: string }) {
    const data = sanitizeBody(rawData) as Record<string, unknown>

    // Text validation
    const text = typeof data.text === 'string' ? data.text.trim() : ''
    if (!text) throw new ValidationError('text is required')
    if (text.length > MAX_TEXT_LENGTH) {
      throw new ValidationError(`text must be ${MAX_TEXT_LENGTH} characters or fewer`)
    }

    // Enum coercion with defaults
    const source: CaptureSource = VALID_CAPTURE_SOURCES.includes(data.source as CaptureSource)
      ? (data.source as CaptureSource) : 'manual'
    const type: CaptureType = VALID_CAPTURE_TYPES.includes(data.type as CaptureType)
      ? (data.type as CaptureType) : 'thought'

    // Tag sanitization
    const tags: string[] = (Array.isArray(data.tags) ? data.tags : [])
      .filter((t): t is string => typeof t === 'string')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0 && t.length <= MAX_TAG_LENGTH)
      .slice(0, MAX_TAGS)

    const payload = { text, source, type, tags, processed: false }

    if (isDemoUser(userId)) {
      return {
        _id: `demo-${Date.now()}`,
        ...payload,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }

    const item = await Capture.create({ ...payload, userId })

    audit(userId, 'create', 'captures', item._id.toString(), {
      after: item.toJSON(),
      eventType: 'capture.created',
      source: source as never, // ActivitySource compatible
      metadata: { type: item.type, tags: item.tags },
    })

    return item
  }

  /**
   * Update a capture (processed flag, text, type, tags).
   */
  static async updateCapture(
    userId: string,
    captureId: string,
    rawData: Partial<ICapture>
  ) {
    if (!isValidObjectId(captureId)) throw new ValidationError('Invalid capture ID')

    const data = sanitizeBody(rawData) as Record<string, unknown>
    const allowedUpdates: Record<string, unknown> = {}

    if (typeof data.processed === 'boolean') allowedUpdates.processed = data.processed
    if (typeof data.text === 'string' && (data.text as string).trim()) {
      const t = (data.text as string).trim()
      if (t.length > MAX_TEXT_LENGTH) throw new ValidationError(`text must be ${MAX_TEXT_LENGTH} characters or fewer`)
      allowedUpdates.text = t
    }
    if (VALID_CAPTURE_TYPES.includes(data.type as CaptureType)) allowedUpdates.type = data.type
    if (Array.isArray(data.tags)) {
      allowedUpdates.tags = (data.tags as unknown[])
        .filter((t): t is string => typeof t === 'string')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0 && t.length <= MAX_TAG_LENGTH)
        .slice(0, MAX_TAGS)
    }

    if (isDemoUser(userId)) {
      const existing = DEMO_CAPTURES.find(c => c._id === captureId) || {}
      return { ...existing, ...allowedUpdates, _id: captureId, userId }
    }

    const before = await Capture.findOne({ _id: captureId, userId })
    if (!before) throw new NotFoundError('Capture not found')

    const item = await Capture.findOneAndUpdate({ _id: captureId, userId }, allowedUpdates, { new: true })
    if (!item) throw new NotFoundError('Capture not found')

    const wasProcessed = allowedUpdates.processed === true && before.processed !== true

    audit(userId, 'update', 'captures', captureId, {
      before: before.toJSON(),
      after: item.toJSON(),
      changes: allowedUpdates,
      eventType: wasProcessed ? 'capture.processed' : 'generic.update',
      source: 'manual',
      metadata: { type: item.type },
    })

    return item
  }

  /**
   * Delete a capture.
   */
  static async deleteCapture(userId: string, captureId: string) {
    if (!isValidObjectId(captureId)) throw new ValidationError('Invalid capture ID')
    if (isDemoUser(userId)) return true

    const item = await Capture.findOne({ _id: captureId, userId })
    if (!item) throw new NotFoundError('Capture not found')

    audit(userId, 'delete', 'captures', captureId, {
      before: item.toJSON(),
      eventType: 'capture.deleted',
      source: 'manual',
      metadata: { type: item.type },
    })

    await Capture.findOneAndDelete({ _id: captureId, userId })
    return true
  }
}
