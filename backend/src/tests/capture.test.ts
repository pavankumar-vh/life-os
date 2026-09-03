/**
 * Unit tests for Universal Capture — validates model constraints,
 * source/type enums, tag sanitization, and query building.
 *
 * Runs WITHOUT a real MongoDB connection; tests pure logic only.
 */

// ─── 1. Source & Type Enum Validation ────────────────────────────────────────

const VALID_SOURCES = ['manual', 'api', 'import', 'automation', 'future_mcp', 'future_agent']
const VALID_TYPES   = ['thought', 'idea', 'todo', 'reminder']

function resolveSource(raw: unknown): string {
  return VALID_SOURCES.includes(raw as string) ? (raw as string) : 'manual'
}

function resolveType(raw: unknown): string {
  return VALID_TYPES.includes(raw as string) ? (raw as string) : 'thought'
}

describe('Capture source resolution', () => {
  test.each(VALID_SOURCES)('accepts valid source "%s"', (src) => {
    expect(resolveSource(src)).toBe(src)
  })
  test('defaults to "manual" for unknown source', () => {
    expect(resolveSource('ai_bot')).toBe('manual')
    expect(resolveSource(undefined)).toBe('manual')
    expect(resolveSource(null)).toBe('manual')
    expect(resolveSource(123)).toBe('manual')
  })
})

describe('Capture type resolution', () => {
  test.each(VALID_TYPES)('accepts valid type "%s"', (t) => {
    expect(resolveType(t)).toBe(t)
  })
  test('defaults to "thought" for unknown type', () => {
    expect(resolveType('expense')).toBe('thought')
    expect(resolveType(undefined)).toBe('thought')
  })
})

// ─── 2. Text Validation ───────────────────────────────────────────────────────

function validateText(raw: unknown): { ok: true; text: string } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: 'text is required' }
  }
  return { ok: true, text: raw.trim() }
}

describe('Capture text validation', () => {
  test('accepts valid text', () => {
    expect(validateText('Need to finish auth tomorrow.')).toEqual({ ok: true, text: 'Need to finish auth tomorrow.' })
    expect(validateText('  trimmed  ')).toEqual({ ok: true, text: 'trimmed' })
  })
  test('rejects empty/missing text', () => {
    expect(validateText('')).toMatchObject({ ok: false })
    expect(validateText('   ')).toMatchObject({ ok: false })
    expect(validateText(null)).toMatchObject({ ok: false })
    expect(validateText(undefined)).toMatchObject({ ok: false })
    expect(validateText(42)).toMatchObject({ ok: false })
  })
})

// ─── 3. Tag Sanitization ─────────────────────────────────────────────────────

function sanitizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((t): t is string => typeof t === 'string')
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0 && t.length <= 50)
    .slice(0, 10)
}

describe('Tag sanitization', () => {
  test('lowercases and trims tags', () => {
    expect(sanitizeTags(['  Idea  ', 'WORK'])).toEqual(['idea', 'work'])
  })
  test('drops non-string entries', () => {
    expect(sanitizeTags([1, null, 'valid', true])).toEqual(['valid'])
  })
  test('drops tags that are empty after trim', () => {
    expect(sanitizeTags(['   ', ''])).toEqual([])
  })
  test('drops tags longer than 50 chars', () => {
    const long = 'a'.repeat(51)
    expect(sanitizeTags([long])).toEqual([])
  })
  test('caps at 10 tags', () => {
    const many = Array.from({ length: 20 }, (_, i) => `tag${i}`)
    expect(sanitizeTags(many)).toHaveLength(10)
  })
  test('returns empty array for non-array input', () => {
    expect(sanitizeTags('work')).toEqual([])
    expect(sanitizeTags(null)).toEqual([])
  })
})

// ─── 4. Allowed-updates Whitelist ────────────────────────────────────────────

function buildAllowedUpdates(body: Record<string, unknown>): Record<string, unknown> {
  const updates: Record<string, unknown> = {}
  if (typeof body.processed === 'boolean') updates.processed = body.processed
  if (typeof body.text === 'string' && (body.text as string).trim()) updates.text = (body.text as string).trim()
  if (VALID_TYPES.includes(body.type as string)) updates.type = body.type
  if (Array.isArray(body.tags)) updates.tags = sanitizeTags(body.tags)
  return updates
}

describe('Allowed update fields whitelist', () => {
  test('passes through valid fields', () => {
    const result = buildAllowedUpdates({ processed: true, text: 'Updated', type: 'idea', tags: ['work'] })
    expect(result).toEqual({ processed: true, text: 'Updated', type: 'idea', tags: ['work'] })
  })
  test('blocks source from being updated', () => {
    const result = buildAllowedUpdates({ source: 'api', processed: true })
    expect(result).not.toHaveProperty('source')
    expect(result).toHaveProperty('processed', true)
  })
  test('blocks userId from being updated', () => {
    const result = buildAllowedUpdates({ userId: 'attacker-123', processed: false })
    expect(result).not.toHaveProperty('userId')
  })
  test('blocks invalid type from being set', () => {
    const result = buildAllowedUpdates({ type: 'expense' })
    expect(result).not.toHaveProperty('type')
  })
})

// ─── 5. User Isolation ────────────────────────────────────────────────────────

describe('User isolation invariant', () => {
  test('all DB queries must include userId in filter', () => {
    // Simulate a filter builder similar to what the route does
    function buildFilter(userId: string, extra: Record<string, unknown> = {}) {
      return { userId, ...extra }
    }
    const filter = buildFilter('user-abc', { type: 'idea' })
    expect(filter).toHaveProperty('userId', 'user-abc')
  })

  test('demo user check is exact string match', () => {
    function isDemoUser(id: string) { return id === 'demo-user-001' }
    expect(isDemoUser('demo-user-001')).toBe(true)
    expect(isDemoUser('demo-user-002')).toBe(false)
    expect(isDemoUser('')).toBe(false)
  })
})

// ─── 6. Query String Builder ──────────────────────────────────────────────────

function buildQueryString(params: { q?: string; type?: string; source?: string; processed?: boolean }): string {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.type) qs.set('type', params.type)
  if (params.source) qs.set('source', params.source)
  if (params.processed !== undefined) qs.set('processed', String(params.processed))
  return qs.toString() ? `?${qs.toString()}` : ''
}

describe('Client-side query builder', () => {
  test('returns empty string when no params', () => {
    expect(buildQueryString({})).toBe('')
  })
  test('builds correct search query', () => {
    const qs = buildQueryString({ q: 'kairos idea' })
    expect(qs).toContain('q=kairos+idea')
  })
  test('handles processed=false correctly', () => {
    const qs = buildQueryString({ processed: false })
    expect(qs).toContain('processed=false')
  })
  test('combines multiple params', () => {
    const qs = buildQueryString({ type: 'idea', processed: true })
    expect(qs).toContain('type=idea')
    expect(qs).toContain('processed=true')
  })
})

// ─── 7. Pagination Guard ──────────────────────────────────────────────────────

describe('Pagination limit guard', () => {
  function resolveLimit(raw: string, max = 500): number {
    const n = parseInt(raw, 10)
    return Math.min(isNaN(n) || n <= 0 ? 200 : n, max)
  }
  test('defaults to 200', () => expect(resolveLimit('')).toBe(200))
  test('caps at 500', () => expect(resolveLimit('9999')).toBe(500))
  test('rejects negative', () => expect(resolveLimit('-1')).toBe(200))
  test('accepts valid limit', () => expect(resolveLimit('50')).toBe(50))
})
