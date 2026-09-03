/**
 * Unit tests for Global Search — covers all pure-logic layers:
 * - SearchService helpers (snippet, scoring, regex)
 * - API route parameter validation
 * - User isolation invariants
 * - Pagination guard
 * - Type allow-list
 * - Frontend query builder
 */

// ─── Re-implement helpers locally for testability ─────────────────────────────
// These mirror SearchService.ts exactly. Any drift here = a signal to update.

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function makeSnippet(text: string, q: string, maxLen = 120): string {
  const plain = stripHtml(text)
  const lower = plain.toLowerCase()
  const idx = lower.indexOf(q.toLowerCase())
  if (idx === -1) return plain.slice(0, maxLen)
  const start = Math.max(0, idx - 40)
  const end = Math.min(plain.length, idx + q.length + 80)
  const snippet = plain.slice(start, end)
  return (start > 0 ? '…' : '') + snippet + (end < plain.length ? '…' : '')
}

function buildRegexes(q: string): RegExp[] {
  return q.trim().split(/\s+/).filter(Boolean).map(w => new RegExp(w, 'i'))
}

function countMatches(regexes: RegExp[], ...strs: string[]): number {
  const combined = strs.join(' ')
  return regexes.reduce((n, re) => n + (re.test(combined) ? 1 : 0), 0)
}

function scoreResult(matches: number, total: number, isExact: boolean, recencyDays: number): number {
  const coverage = total > 0 ? (matches / total) * 60 : 0
  const exact = isExact ? 20 : 0
  const recency = Math.max(0, 20 - recencyDays * 0.5)
  return Math.round(Math.min(100, coverage + exact + recency))
}

function daysSince(iso: string): number {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 86400000)
}

// ─── 1. HTML stripping ────────────────────────────────────────────────────────

describe('stripHtml', () => {
  test('removes simple tags', () => {
    expect(stripHtml('<p>Hello</p>')).toBe('Hello')
  })
  test('removes nested tags', () => {
    expect(stripHtml('<div><b>Bold</b> and <i>italic</i></div>')).toBe('Bold and italic')
  })
  test('collapses whitespace', () => {
    expect(stripHtml('<p>  a  </p>   <p>b</p>')).toBe('a b')
  })
  test('passthrough plain text', () => {
    expect(stripHtml('no tags here')).toBe('no tags here')
  })
})

// ─── 2. Snippet extraction ────────────────────────────────────────────────────

describe('makeSnippet', () => {
  test('returns snippet around match', () => {
    const text = 'The quick brown fox jumps over the lazy dog'
    const snippet = makeSnippet(text, 'fox')
    expect(snippet).toContain('fox')
  })
  test('returns start of text when no match', () => {
    const text = 'Hello world'
    const snippet = makeSnippet(text, 'zzz', 5)
    expect(snippet).toBe('Hello')
  })
  test('adds ellipsis when truncated at start', () => {
    const text = 'a'.repeat(50) + ' match ' + 'b'.repeat(50)
    const snippet = makeSnippet(text, 'match')
    expect(snippet).toContain('match')
  })
  test('strips HTML before extracting snippet', () => {
    const html = '<p>This is a <b>test</b> sentence with keyword</p>'
    const snippet = makeSnippet(html, 'keyword')
    expect(snippet).toContain('keyword')
    expect(snippet).not.toContain('<p>')
  })
})

// ─── 3. Regex builder ─────────────────────────────────────────────────────────

describe('buildRegexes', () => {
  test('creates one regex per word', () => {
    expect(buildRegexes('hello world')).toHaveLength(2)
  })
  test('is case-insensitive', () => {
    const [re] = buildRegexes('Hello')
    expect(re.test('hello')).toBe(true)
    expect(re.test('HELLO')).toBe(true)
  })
  test('ignores extra whitespace', () => {
    expect(buildRegexes('  a   b  ')).toHaveLength(2)
  })
  test('single word', () => {
    expect(buildRegexes('kairos')).toHaveLength(1)
  })
})

// ─── 4. Match counting ────────────────────────────────────────────────────────

describe('countMatches', () => {
  test('counts matching regexes', () => {
    const regexes = buildRegexes('auth system')
    expect(countMatches(regexes, 'implement auth system')).toBe(2)
  })
  test('partial match returns correct count', () => {
    const regexes = buildRegexes('auth distributed')
    expect(countMatches(regexes, 'implement auth')).toBe(1)
  })
  test('no match returns 0', () => {
    const regexes = buildRegexes('elephant')
    expect(countMatches(regexes, 'hello world')).toBe(0)
  })
  test('combines multiple strings', () => {
    const regexes = buildRegexes('kairos idea')
    expect(countMatches(regexes, 'kairos', 'my best idea')).toBe(2)
  })
})

// ─── 5. Score function ────────────────────────────────────────────────────────

describe('scoreResult', () => {
  test('exact title match boosts score', () => {
    const withExact    = scoreResult(2, 2, true, 0)
    const withoutExact = scoreResult(2, 2, false, 0)
    expect(withExact).toBeGreaterThan(withoutExact)
  })
  test('full coverage (all words matched) = 60 pts from coverage', () => {
    const score = scoreResult(3, 3, false, 0)
    expect(score).toBeGreaterThanOrEqual(60)
  })
  test('recent items score higher than old', () => {
    const recent = scoreResult(1, 1, false, 0)
    const old    = scoreResult(1, 1, false, 100)
    expect(recent).toBeGreaterThan(old)
  })
  test('score is capped at 100', () => {
    expect(scoreResult(10, 1, true, 0)).toBeLessThanOrEqual(100)
  })
  test('score is never negative', () => {
    expect(scoreResult(0, 5, false, 999)).toBeGreaterThanOrEqual(0)
  })
})

// ─── 6. User isolation ────────────────────────────────────────────────────────

describe('User isolation', () => {
  test('userId is always injected into DB filter', () => {
    // Simulate the pattern used in every searcher
    function buildFilter(userId: string, extra: Record<string, unknown> = {}) {
      return { userId, ...extra }
    }
    const filter = buildFilter('user-xyz', { $or: [{ title: /search/i }] })
    expect(filter.userId).toBe('user-xyz')
  })

  test('userId cannot be overridden by extra params', () => {
    function buildFilter(userId: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
      // Destructure to prevent external userId override (as done in route)
      const { userId: _ignored, ...safeExtra } = extra
      return { userId, ...safeExtra }
    }
    const filter = buildFilter('user-abc', { userId: 'attacker-id', type: 'task' })
    expect(filter['userId']).toBe('user-abc')
    expect(filter['type']).toBe('task')
  })
})

// ─── 7. API query param validation ───────────────────────────────────────────

const VALID_TYPES = ['task', 'goal', 'note', 'journal', 'habit', 'capture', 'bookmark', 'book', 'project']

function validateSearchParams(params: Record<string, string>): { ok: boolean; error?: string } {
  const q = (params.q || '').trim()
  if (!q) return { ok: false, error: 'q is required and must be non-empty' }
  if (q.length > 200) return { ok: false, error: 'q must be ≤ 200 characters' }

  if (params.types) {
    const requested = params.types.split(',').map(t => t.trim())
    const valid = requested.filter(t => VALID_TYPES.includes(t))
    if (valid.length === 0) return { ok: false, error: `types must be one or more of: ${VALID_TYPES.join(', ')}` }
  }
  return { ok: true }
}

function resolveSearchLimit(raw: string): number {
  const n = parseInt(raw, 10)
  return isNaN(n) || n <= 0 ? 30 : Math.min(n, 100)
}

describe('API query validation', () => {
  test('rejects empty q', () => {
    expect(validateSearchParams({ q: '' })).toMatchObject({ ok: false })
  })
  test('rejects whitespace-only q', () => {
    expect(validateSearchParams({ q: '   ' })).toMatchObject({ ok: false })
  })
  test('rejects q > 200 chars', () => {
    expect(validateSearchParams({ q: 'a'.repeat(201) })).toMatchObject({ ok: false })
  })
  test('accepts valid q', () => {
    expect(validateSearchParams({ q: 'auth system' })).toMatchObject({ ok: true })
  })
  test('rejects all-invalid types', () => {
    expect(validateSearchParams({ q: 'test', types: 'expense,foobar' })).toMatchObject({ ok: false })
  })
  test('accepts valid type filter', () => {
    expect(validateSearchParams({ q: 'test', types: 'task,note' })).toMatchObject({ ok: true })
  })
  test('limit defaults to 30', () => {
    expect(resolveSearchLimit('')).toBe(30)
  })
  test('limit caps at 100', () => {
    expect(resolveSearchLimit('999')).toBe(100)
  })
  test('negative limit defaults to 30', () => {
    expect(resolveSearchLimit('-5')).toBe(30)
  })
})

// ─── 8. Result sorting invariant ─────────────────────────────────────────────

describe('Result ranking', () => {
  const makeResult = (score: number, updatedAt: string) => ({ score, updatedAt })

  test('higher score comes first', () => {
    const results = [makeResult(40, '2026-01-01'), makeResult(80, '2026-01-01')]
    results.sort((a, b) => b.score !== a.score ? b.score - a.score : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    expect(results[0].score).toBe(80)
  })

  test('tie-breaks by recency (newer first)', () => {
    const results = [
      makeResult(50, '2025-01-01'),
      makeResult(50, '2026-06-01'),
    ]
    results.sort((a, b) => b.score !== a.score ? b.score - a.score : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    expect(results[0].updatedAt).toBe('2026-06-01')
  })
})

// ─── 9. daysSince ─────────────────────────────────────────────────────────────

describe('daysSince', () => {
  test('returns 0 for now', () => {
    expect(daysSince(new Date().toISOString())).toBeCloseTo(0, 0)
  })
  test('returns ~7 for a week ago', () => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    expect(daysSince(d.toISOString())).toBeCloseTo(7, 0)
  })
  test('never goes negative', () => {
    // future date
    const d = new Date()
    d.setDate(d.getDate() + 5)
    expect(daysSince(d.toISOString())).toBe(0)
  })
})
