/**
 * SearchService — Life OS unified search layer.
 *
 * Architecture note
 * -----------------
 * The public API is intentionally narrow: callers only pass a plain
 * SearchQuery and get back typed SearchResult[].
 *
 * Strategy evolution path (no breaking changes to callers):
 *   keyword   ← current implementation
 *   hybrid    ← add re-ranking / boosted-regex in keywordSearch()
 *   semantic  ← replace/augment with vectorSearch() + merge results
 *
 * Each collection has its own searcher that returns SearchResult[].
 * The orchestrator runs them in parallel, merges, scores, and paginates.
 */

import mongoose from 'mongoose'
import { Task }     from '../models/Task'
import { Goal }     from '../models/Goal'
import { Note }     from '../models/Note'
import { Journal }  from '../models/Journal'
import { Habit }    from '../models/Habit'
import { Capture }  from '../models/Capture'
import { Bookmark } from '../models/Bookmark'
import { Book }     from '../models/Book'
import { Project }  from '../models/Project'

// ─── Public types ─────────────────────────────────────────────────────────────

export type SearchResultType =
  | 'task' | 'goal' | 'note' | 'journal' | 'habit'
  | 'capture' | 'bookmark' | 'book' | 'project'

export interface SearchResult {
  /** Stable ID: "<type>:<_id>" */
  id: string
  type: SearchResultType
  /** Primary label shown in the UI */
  title: string
  /** Secondary line — date, status, folder, etc. */
  subtitle: string
  /** Snippet of matched text (plain text, no HTML) */
  snippet?: string
  /** Which view to navigate to on click */
  view: string
  /** Raw record id in MongoDB */
  recordId: string
  /** Higher = better match. Used for ranking. */
  score: number
  /** ISO timestamp for recency boosting */
  updatedAt: string
}

export interface SearchQuery {
  /** Raw query string */
  q: string
  /** Which collection types to include. Empty = all. */
  types?: SearchResultType[]
  /** Max results to return (default 30, max 100) */
  limit?: number
  /** Offset for pagination */
  skip?: number
  /** User ID — ALWAYS required. Never trust callers to filter. */
  userId: string
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
  durationMs: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip HTML tags for snippet extraction */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Extract a short snippet around the first occurrence of a keyword */
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

/** Build a case-insensitive regex for each word in the query */
function buildRegexes(q: string): RegExp[] {
  return q.trim().split(/\s+/).filter(Boolean).map(w => new RegExp(w, 'i'))
}

/** Check if any regex matches a string */
function anyMatch(regexes: RegExp[], str: string): boolean {
  return regexes.some(re => re.test(str))
}

/** Check how many regexes match a combined string (more = higher score) */
function countMatches(regexes: RegExp[], ...strs: string[]): number {
  const combined = strs.join(' ')
  return regexes.reduce((n, re) => n + (re.test(combined) ? 1 : 0), 0)
}

/** Compute a relevance score between 0 and 100 */
function scoreResult(matches: number, total: number, isExact: boolean, recencyDays: number): number {
  const coverage   = total > 0 ? (matches / total) * 60 : 0
  const exact      = isExact ? 20 : 0
  const recency    = Math.max(0, 20 - recencyDays * 0.5)
  return Math.round(Math.min(100, coverage + exact + recency))
}

function daysSince(iso: string): number {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 86400000)
}

// ─── Per-collection searchers ─────────────────────────────────────────────────

async function searchTasks(userId: string, q: string, regexes: RegExp[]): Promise<SearchResult[]> {
  const docs = await Task.find({
    userId: new mongoose.Types.ObjectId(userId),
    $or: [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ],
  }).limit(20).lean()

  return docs.map(d => {
    const text = `${d.title} ${d.description}`
    const matches = countMatches(regexes, text)
    const isExact = d.title.toLowerCase().includes(q.toLowerCase())
    return {
      id: `task:${d._id}`,
      type: 'task' as const,
      title: d.title,
      subtitle: `${d.status} · ${d.priority}${d.dueDate ? ` · due ${d.dueDate}` : ''}`,
      snippet: d.description ? makeSnippet(d.description, q) : undefined,
      view: 'tasks',
      recordId: String(d._id),
      score: scoreResult(matches, regexes.length, isExact, daysSince(String(d.createdAt))),
      updatedAt: String(d.createdAt),
    }
  })
}

async function searchGoals(userId: string, q: string, regexes: RegExp[]): Promise<SearchResult[]> {
  const docs = await Goal.find({
    userId: new mongoose.Types.ObjectId(userId),
    $or: [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } },
    ],
  }).limit(10).lean()

  return docs.map(d => {
    const matches = countMatches(regexes, d.title, d.description, d.category)
    const isExact = d.title.toLowerCase().includes(q.toLowerCase())
    const pct = d.target > 0 ? Math.round((d.progress / d.target) * 100) : 0
    return {
      id: `goal:${d._id}`,
      type: 'goal' as const,
      title: d.title,
      subtitle: `${d.status} · ${pct}% · ${d.category}`,
      snippet: d.description ? makeSnippet(d.description, q) : undefined,
      view: 'goals',
      recordId: String(d._id),
      score: scoreResult(matches, regexes.length, isExact, daysSince(String(d.createdAt))),
      updatedAt: String(d.createdAt),
    }
  })
}

async function searchNotes(userId: string, q: string, regexes: RegExp[]): Promise<SearchResult[]> {
  const docs = await Note.find({
    userId: new mongoose.Types.ObjectId(userId),
    $or: [
      { title: { $regex: q, $options: 'i' } },
      { content: { $regex: q, $options: 'i' } },
      { tags: { $regex: q, $options: 'i' } },
    ],
  }).limit(20).lean()

  return docs.map(d => {
    const plainContent = stripHtml(d.content)
    const matches = countMatches(regexes, d.title, plainContent, (d.tags || []).join(' '))
    const isExact = d.title.toLowerCase().includes(q.toLowerCase())
    return {
      id: `note:${d._id}`,
      type: 'note' as const,
      title: d.title || 'Untitled Note',
      subtitle: d.folder + ((d.tags || []).length > 0 ? ` · #${d.tags.slice(0, 2).join(' #')}` : ''),
      snippet: plainContent ? makeSnippet(plainContent, q) : undefined,
      view: 'notes',
      recordId: String(d._id),
      score: scoreResult(matches, regexes.length, isExact, daysSince(String(d.updatedAt))),
      updatedAt: String(d.updatedAt),
    }
  })
}

async function searchJournal(userId: string, q: string, regexes: RegExp[]): Promise<SearchResult[]> {
  const docs = await Journal.find({
    userId: new mongoose.Types.ObjectId(userId),
    $or: [
      { title: { $regex: q, $options: 'i' } },
      { content: { $regex: q, $options: 'i' } },
      { highlights: { $regex: q, $options: 'i' } },
      { tags: { $regex: q, $options: 'i' } },
    ],
  }).limit(15).lean()

  return docs.map(d => {
    const plain = stripHtml(d.content)
    const matches = countMatches(regexes, d.title, plain, d.highlights, (d.tags || []).join(' '))
    const isExact = d.title.toLowerCase().includes(q.toLowerCase())
    return {
      id: `journal:${d._id}`,
      type: 'journal' as const,
      title: d.title || `Journal — ${d.date}`,
      subtitle: d.date,
      snippet: plain ? makeSnippet(plain, q) : undefined,
      view: 'journal',
      recordId: String(d._id),
      score: scoreResult(matches, regexes.length, isExact, daysSince(d.date)),
      updatedAt: d.date,
    }
  })
}

async function searchHabits(userId: string, q: string, regexes: RegExp[]): Promise<SearchResult[]> {
  const docs = await Habit.find({
    userId: new mongoose.Types.ObjectId(userId),
    name: { $regex: q, $options: 'i' },
  }).limit(10).lean()

  return docs.map(d => {
    const matches = countMatches(regexes, d.name)
    const isExact = d.name.toLowerCase().includes(q.toLowerCase())
    return {
      id: `habit:${d._id}`,
      type: 'habit' as const,
      title: d.name,
      subtitle: `${d.streak} day streak · ${d.frequency}`,
      view: 'habits',
      recordId: String(d._id),
      score: scoreResult(matches, regexes.length, isExact, 0),
      updatedAt: String(d.createdAt),
    }
  })
}

async function searchCaptures(userId: string, q: string, regexes: RegExp[]): Promise<SearchResult[]> {
  const docs = await Capture.find({
    userId: new mongoose.Types.ObjectId(userId),
    $or: [
      { text: { $regex: q, $options: 'i' } },
      { tags: { $regex: q, $options: 'i' } },
    ],
  }).limit(15).lean()

  return docs.map(d => {
    const matches = countMatches(regexes, d.text, (d.tags || []).join(' '))
    const isExact = d.text.toLowerCase().includes(q.toLowerCase())
    return {
      id: `capture:${d._id}`,
      type: 'capture' as const,
      title: d.text.slice(0, 80) + (d.text.length > 80 ? '…' : ''),
      subtitle: `${d.type}${(d.tags || []).length > 0 ? ` · #${d.tags.slice(0, 2).join(' #')}` : ''}`,
      snippet: d.text.length > 80 ? makeSnippet(d.text, q) : undefined,
      view: 'capture',
      recordId: String(d._id),
      score: scoreResult(matches, regexes.length, isExact, daysSince(String(d.createdAt))),
      updatedAt: String(d.createdAt),
    }
  })
}

async function searchBookmarks(userId: string, q: string, regexes: RegExp[]): Promise<SearchResult[]> {
  const docs = await Bookmark.find({
    userId: new mongoose.Types.ObjectId(userId),
    $or: [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { url: { $regex: q, $options: 'i' } },
      { tags: { $regex: q, $options: 'i' } },
    ],
  }).limit(10).lean()

  return docs.map(d => {
    const matches = countMatches(regexes, d.title, d.description, d.url)
    const isExact = d.title.toLowerCase().includes(q.toLowerCase())
    return {
      id: `bookmark:${d._id}`,
      type: 'bookmark' as const,
      title: d.title,
      subtitle: d.url,
      snippet: d.description ? makeSnippet(d.description, q) : undefined,
      view: 'bookmarks',
      recordId: String(d._id),
      score: scoreResult(matches, regexes.length, isExact, 0),
      updatedAt: String((d as unknown as Record<string, unknown>).createdAt ?? new Date()),
    }
  })
}

async function searchBooks(userId: string, q: string, regexes: RegExp[]): Promise<SearchResult[]> {
  const docs = await Book.find({
    userId: new mongoose.Types.ObjectId(userId),
    $or: [
      { title: { $regex: q, $options: 'i' } },
      { author: { $regex: q, $options: 'i' } },
      { notes: { $regex: q, $options: 'i' } },
    ],
  }).limit(10).lean()

  return docs.map(d => {
    const matches = countMatches(regexes, d.title, d.author, d.notes)
    const isExact = d.title.toLowerCase().includes(q.toLowerCase())
    return {
      id: `book:${d._id}`,
      type: 'book' as const,
      title: d.title,
      subtitle: `${d.author} · ${d.status}`,
      snippet: d.notes ? makeSnippet(d.notes, q) : undefined,
      view: 'reading',
      recordId: String(d._id),
      score: scoreResult(matches, regexes.length, isExact, 0),
      updatedAt: String(d.finishDate || d.startDate || new Date()),
    }
  })
}

async function searchProjects(userId: string, q: string, regexes: RegExp[]): Promise<SearchResult[]> {
  const docs = await Project.find({
    userId: new mongoose.Types.ObjectId(userId),
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ],
  }).limit(10).lean()

  return docs.map(d => {
    const matches = countMatches(regexes, d.name, d.description)
    const isExact = d.name.toLowerCase().includes(q.toLowerCase())
    return {
      id: `project:${d._id}`,
      type: 'project' as const,
      title: d.name,
      subtitle: `${d.status} · ${d.progress}%`,
      snippet: d.description ? makeSnippet(d.description, q) : undefined,
      view: 'projects',
      recordId: String(d._id),
      score: scoreResult(matches, regexes.length, isExact, daysSince(String((d as unknown as Record<string, unknown>).createdAt ?? new Date()))),
      updatedAt: String((d as unknown as Record<string, unknown>).createdAt ?? new Date()),
    }
  })
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/** All registered searchers keyed by type */
const SEARCHERS: Record<
  SearchResultType,
  (userId: string, q: string, regexes: RegExp[]) => Promise<SearchResult[]>
> = {
  task:     searchTasks,
  goal:     searchGoals,
  note:     searchNotes,
  journal:  searchJournal,
  habit:    searchHabits,
  capture:  searchCaptures,
  bookmark: searchBookmarks,
  book:     searchBooks,
  project:  searchProjects,
}

const ALL_TYPES = Object.keys(SEARCHERS) as SearchResultType[]

/**
 * keywordSearch — runs all requested searchers in parallel, merges,
 * de-dupes, sorts by score desc then updatedAt desc, and paginates.
 *
 * This is the V1 implementation. A future hybrid/semantic implementation
 * would replace this function body without changing the signature.
 */
async function keywordSearch(query: SearchQuery): Promise<SearchResponse> {
  const t0 = Date.now()
  const q = query.q.trim()
  const types = query.types?.length ? query.types : ALL_TYPES
  const limit = Math.min(query.limit ?? 30, 100)
  const skip  = query.skip ?? 0
  const regexes = buildRegexes(q)

  // Fan out — all collections searched in parallel
  const perType = await Promise.allSettled(
    types.map(type => SEARCHERS[type](query.userId, q, regexes))
  )

  // Collect results, swallow individual searcher failures gracefully
  const all: SearchResult[] = []
  perType.forEach((r, i) => {
    if (r.status === 'fulfilled') all.push(...r.value)
    else console.error(`Search failed for type ${types[i]}:`, r.reason)
  })

  // Sort: score DESC, then updatedAt DESC
  all.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  const total = all.length
  const results = all.slice(skip, skip + limit)

  return {
    results,
    total,
    query: q,
    durationMs: Date.now() - t0,
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
// This is the only function consumers should call.
// Swap out the implementation below to upgrade search strategy.

export const SearchService = {
  /**
   * Execute a search query.
   * V1: keyword regex search across all collections in parallel.
   * Future: replace body of `keywordSearch` with hybrid/semantic
   * without changing this interface.
   */
  search: keywordSearch,
}
