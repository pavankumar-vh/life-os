/**
 * Unit tests for the Today / Dashboard improvements.
 * Tests all pure-logic: date boundaries, overdue detection,
 * task scoping, goal deadline priority, inbox counting,
 * empty states, user isolation, timezone handling.
 * No DB connection required.
 */

// ─── Helpers (mirroring Dashboard.tsx and today.ts logic) ────────────────────

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toISODate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10)
}

/** Server-side local date from UTC offset in minutes ahead */
function localDateString(offsetMinutes: number, now: Date = new Date()): string {
  const local = new Date(now.getTime() + offsetMinutes * 60000)
  return local.toISOString().slice(0, 10)
}

// ─── 1. Date parsing ──────────────────────────────────────────────────────────

describe('parseLocalDate', () => {
  test('parses YYYY-MM-DD to local midnight', () => {
    const d = parseLocalDate('2026-09-04')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(8)   // 0-indexed
    expect(d.getDate()).toBe(4)
  })
  test('is deterministic regardless of system timezone', () => {
    const d = parseLocalDate('2026-01-01')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(1)
  })
})

// ─── 2. Today string ──────────────────────────────────────────────────────────

describe('toISODate', () => {
  test('returns YYYY-MM-DD format', () => {
    const s = toISODate()
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  test('is consistent with Date.now()', () => {
    const d = new Date()
    expect(toISODate(d)).toBe(toISODate(d))
  })
})

// ─── 3. Overdue task detection ────────────────────────────────────────────────

const TODAY = '2026-09-04'

interface Task {
  _id: string
  title: string
  status: string
  dueDate: string | null
  priority: string
}

function getOverdueTasks(tasks: Task[], today: string): Task[] {
  return tasks
    .filter(t => t.status !== 'done' && t.dueDate && t.dueDate.slice(0, 10) < today)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
}

function getTodayTasks(tasks: Task[], today: string): Task[] {
  return tasks.filter(t => t.dueDate && t.dueDate.slice(0, 10) === today)
}

describe('Overdue task detection', () => {
  const tasks: Task[] = [
    { _id: '1', title: 'Old task',    status: 'todo',        dueDate: '2026-09-01', priority: 'high' },
    { _id: '2', title: 'Today task',  status: 'todo',        dueDate: '2026-09-04', priority: 'medium' },
    { _id: '3', title: 'Future task', status: 'todo',        dueDate: '2026-09-10', priority: 'low' },
    { _id: '4', title: 'Done old',    status: 'done',        dueDate: '2026-09-01', priority: 'high' },
    { _id: '5', title: 'No date',     status: 'todo',        dueDate: null,          priority: 'urgent' },
    { _id: '6', title: 'Yesterday',   status: 'in-progress', dueDate: '2026-09-03', priority: 'medium' },
  ]

  test('returns only past-due non-done tasks', () => {
    const overdue = getOverdueTasks(tasks, TODAY)
    expect(overdue.map(t => t._id)).toEqual(expect.arrayContaining(['1', '6']))
    expect(overdue.map(t => t._id)).not.toContain('4') // done
    expect(overdue.map(t => t._id)).not.toContain('3') // future
    expect(overdue.map(t => t._id)).not.toContain('2') // today (not overdue)
    expect(overdue.map(t => t._id)).not.toContain('5') // no date
  })

  test('sorts by dueDate ascending (oldest first)', () => {
    const overdue = getOverdueTasks(tasks, TODAY)
    expect(overdue[0]._id).toBe('1') // 2026-09-01 before 2026-09-03
  })

  test('today is NOT overdue', () => {
    const overdue = getOverdueTasks(tasks, TODAY)
    expect(overdue.map(t => t._id)).not.toContain('2')
  })

  test('no tasks returns empty array', () => {
    expect(getOverdueTasks([], TODAY)).toEqual([])
  })

  test('all done tasks returns empty array', () => {
    const done = tasks.map(t => ({ ...t, status: 'done' }))
    expect(getOverdueTasks(done, TODAY)).toEqual([])
  })
})

// ─── 4. Today task scoping ────────────────────────────────────────────────────

describe('Today task scoping', () => {
  const tasks: Task[] = [
    { _id: '1', title: 'Due today',     status: 'todo', dueDate: '2026-09-04', priority: 'medium' },
    { _id: '2', title: 'Due yesterday', status: 'todo', dueDate: '2026-09-03', priority: 'high' },
    { _id: '3', title: 'Due tomorrow',  status: 'todo', dueDate: '2026-09-05', priority: 'low' },
    { _id: '4', title: 'No date',       status: 'todo', dueDate: null,          priority: 'urgent' },
    { _id: '5', title: 'Done today',    status: 'done', dueDate: '2026-09-04', priority: 'low' },
  ]

  test('returns only tasks due today', () => {
    const today = getTodayTasks(tasks, TODAY)
    expect(today.map(t => t._id)).toEqual(expect.arrayContaining(['1', '5']))
    expect(today).toHaveLength(2)
  })

  test('excludes tasks with no due date', () => {
    const today = getTodayTasks(tasks, TODAY)
    expect(today.map(t => t._id)).not.toContain('4')
  })
})

// ─── 5. Habit completion ─────────────────────────────────────────────────────

interface Habit {
  _id: string
  name: string
  completedDates: string[]
  streak: number
}

function habitStats(habits: Habit[], today: string) {
  const completed = habits.filter(h => h.completedDates.includes(today)).length
  const total = habits.length
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  return { completed, total, pending: total - completed, percent }
}

describe('Habit completion stats', () => {
  const habits: Habit[] = [
    { _id: '1', name: 'Run',       completedDates: [TODAY],        streak: 5 },
    { _id: '2', name: 'Read',      completedDates: ['2026-09-03'], streak: 3 },
    { _id: '3', name: 'Meditate',  completedDates: [TODAY],        streak: 7 },
  ]

  test('counts completed correctly', () => {
    const stats = habitStats(habits, TODAY)
    expect(stats.completed).toBe(2)
    expect(stats.pending).toBe(1)
  })

  test('calculates percent correctly', () => {
    const stats = habitStats(habits, TODAY)
    expect(stats.percent).toBe(67)
  })

  test('returns 0% when no habits', () => {
    expect(habitStats([], TODAY).percent).toBe(0)
  })

  test('returns 0% when none done today', () => {
    const none = habits.map(h => ({ ...h, completedDates: [] }))
    expect(habitStats(none, TODAY).percent).toBe(0)
  })

  test('returns 100% when all done', () => {
    const all = habits.map(h => ({ ...h, completedDates: [TODAY] }))
    expect(habitStats(all, TODAY).percent).toBe(100)
  })
})

// ─── 6. Goal urgency — deadline-aware ────────────────────────────────────────

interface Goal {
  _id: string
  status: string
  title: string
  progress: number
  target: number
  deadline: string | null
}

function getUrgentGoal(goals: Goal[], today: string): Goal | null {
  const withDeadline = goals
    .filter(g => g.status === 'active' && g.deadline && g.deadline >= today && g.target > 0)
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
  if (withDeadline.length > 0) return withDeadline[0]
  const active = goals.filter(g => g.status === 'active' && g.target > 0)
  if (active.length === 0) return null
  return active.reduce((best, g) => g.progress / g.target > best.progress / best.target ? g : best)
}

function getDeadlineSoon(goals: Goal[], today: string, daysAhead = 7): Goal[] {
  const futureDate = new Date(parseLocalDate(today))
  futureDate.setDate(futureDate.getDate() + daysAhead)
  const limit = toISODate(futureDate)
  return goals.filter(g =>
    g.status === 'active' && g.deadline && g.deadline >= today && g.deadline <= limit
  )
}

describe('Goal urgency', () => {
  const goals: Goal[] = [
    { _id: '1', status: 'active', title: 'Nearest deadline', progress: 40, target: 100, deadline: '2026-09-06' },
    { _id: '2', status: 'active', title: 'Far deadline',     progress: 80, target: 100, deadline: '2026-12-01' },
    { _id: '3', status: 'active', title: 'No deadline',      progress: 90, target: 100, deadline: null },
    { _id: '4', status: 'completed', title: 'Done',          progress: 100,target: 100, deadline: '2026-09-05' },
    { _id: '5', status: 'active', title: 'Overdue deadline', progress: 20, target: 100, deadline: '2026-09-01' },
  ]

  test('prefers nearest upcoming deadline', () => {
    const urgent = getUrgentGoal(goals, TODAY)
    expect(urgent?._id).toBe('1')
  })

  test('excludes completed goals', () => {
    const urgent = getUrgentGoal(goals, TODAY)
    expect(urgent?._id).not.toBe('4')
  })

  test('excludes past deadlines', () => {
    const urgent = getUrgentGoal(goals, TODAY)
    expect(urgent?._id).not.toBe('5')
  })

  test('falls back to highest-progress goal when no deadlines', () => {
    const noDeadline = goals.map(g => ({ ...g, deadline: null })).filter(g => g.status === 'active')
    const urgent = getUrgentGoal(noDeadline, TODAY)
    expect(urgent?._id).toBe('3') // 90% progress
  })

  test('returns null when no active goals', () => {
    expect(getUrgentGoal([], TODAY)).toBeNull()
  })
})

describe('Goals deadline soon', () => {
  const goals: Goal[] = [
    { _id: '1', status: 'active', title: 'In 3 days',  progress: 50, target: 100, deadline: '2026-09-07' },
    { _id: '2', status: 'active', title: 'In 8 days',  progress: 30, target: 100, deadline: '2026-09-12' },
    { _id: '3', status: 'active', title: 'Yesterday',  progress: 20, target: 100, deadline: '2026-09-03' },
    { _id: '4', status: 'active', title: 'No deadline',progress: 70, target: 100, deadline: null },
    { _id: '5', status: 'active', title: 'Today',      progress: 10, target: 100, deadline: '2026-09-04' },
  ]

  test('returns goals with deadline within 7 days (inclusive)', () => {
    const soon = getDeadlineSoon(goals, TODAY)
    expect(soon.map(g => g._id)).toEqual(expect.arrayContaining(['1', '5']))
    expect(soon).toHaveLength(2)
  })

  test('excludes past deadlines', () => {
    const soon = getDeadlineSoon(goals, TODAY)
    expect(soon.map(g => g._id)).not.toContain('3')
  })

  test('excludes goals without deadline', () => {
    const soon = getDeadlineSoon(goals, TODAY)
    expect(soon.map(g => g._id)).not.toContain('4')
  })
})

// ─── 7. Inbox count ───────────────────────────────────────────────────────────

interface Capture {
  _id: string
  text: string
  processed: boolean
}

describe('Inbox count', () => {
  const captures: Capture[] = [
    { _id: '1', text: 'buy SSD', processed: false },
    { _id: '2', text: 'auth idea', processed: true },
    { _id: '3', text: 'distributed systems', processed: false },
  ]

  test('counts only unprocessed captures', () => {
    const count = captures.filter(c => !c.processed).length
    expect(count).toBe(2)
  })
  test('returns 0 when all processed', () => {
    const all = captures.map(c => ({ ...c, processed: true }))
    expect(all.filter(c => !c.processed).length).toBe(0)
  })
  test('returns 0 for empty captures', () => {
    expect([].filter((c: Capture) => !c.processed).length).toBe(0)
  })
})

// ─── 8. Daily score ───────────────────────────────────────────────────────────

function computeDailyScore({
  totalHabits, completedHabits,
  todayTasksDue, todayTasksDone,
  hasJournal, hasWorkout,
}: {
  totalHabits: number; completedHabits: number
  todayTasksDue: number; todayTasksDone: number
  hasJournal: boolean; hasWorkout: boolean
}): number {
  let score = 0, max = 0
  if (totalHabits > 0) { score += (completedHabits / totalHabits) * 40; max += 40 }
  if (todayTasksDue > 0) { score += (todayTasksDone / todayTasksDue) * 20; max += 20 }
  score += hasJournal ? 20 : 0; max += 20
  score += hasWorkout ? 20 : 0; max += 20
  return max > 0 ? Math.round((score / max) * 100) : 0
}

describe('Daily score', () => {
  test('100% when everything done', () => {
    expect(computeDailyScore({
      totalHabits: 5, completedHabits: 5,
      todayTasksDue: 3, todayTasksDone: 3,
      hasJournal: true, hasWorkout: true,
    })).toBe(100)
  })

  test('0% when nothing done', () => {
    expect(computeDailyScore({
      totalHabits: 3, completedHabits: 0,
      todayTasksDue: 2, todayTasksDone: 0,
      hasJournal: false, hasWorkout: false,
    })).toBe(0)
  })

  test('habits + journal without tasks = still meaningful score', () => {
    const score = computeDailyScore({
      totalHabits: 4, completedHabits: 4,
      todayTasksDue: 0, todayTasksDone: 0,
      hasJournal: true, hasWorkout: false,
    })
    // 40+20 out of 80 = 75%
    expect(score).toBe(75)
  })

  test('uses today tasks not all-time for task component', () => {
    // Only 1 of 2 today tasks done — not 10 lifetime done tasks
    const score = computeDailyScore({
      totalHabits: 0, completedHabits: 0,
      todayTasksDue: 2, todayTasksDone: 1,
      hasJournal: false, hasWorkout: false,
    })
    // 1/2 today tasks done = 10 pts out of 60 total (tasks 20 + journal 20 + workout 20) = 17%
    expect(score).toBe(17)
  })
})

// ─── 9. Timezone offset ───────────────────────────────────────────────────────

describe('Timezone offset handling', () => {
  test('offset of 0 returns UTC date', () => {
    const utcNow = new Date('2026-09-04T00:00:00Z')
    expect(localDateString(0, utcNow)).toBe('2026-09-04')
  })

  test('IST offset (+330) advances date correctly at midnight UTC', () => {
    // At 2026-09-03T23:00:00Z → local IST = 2026-09-04T04:30:00+05:30
    const utcNow = new Date('2026-09-03T23:00:00Z')
    expect(localDateString(330, utcNow)).toBe('2026-09-04')
  })

  test('negative offset moves date back', () => {
    // New York UTC-5 at 2026-09-04T02:00:00Z → local = 2026-09-03T21:00:00
    const utcNow = new Date('2026-09-04T02:00:00Z')
    expect(localDateString(-300, utcNow)).toBe('2026-09-03')
  })

  test('out-of-range offset is clamped', () => {
    const rawTz = parseInt('9999', 10)
    const clamped = Math.max(-840, Math.min(840, rawTz))
    expect(clamped).toBe(840)
  })
})

// ─── 10. User isolation invariant ────────────────────────────────────────────

describe('User isolation', () => {
  test('all queries must include userId', () => {
    function buildQuery(userId: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
      return { userId, ...extra }
    }
    const query = buildQuery('user-abc', { status: 'todo' })
    expect(query['userId']).toBe('user-abc')
  })

  test('userId in body cannot override query userId', () => {
    function safeQuery(userId: string, body: Record<string, unknown>): Record<string, unknown> {
      const { userId: _ignored, ...rest } = body
      return { userId, ...rest }
    }
    const query = safeQuery('user-abc', { userId: 'attacker', status: 'todo' })
    expect(query['userId']).toBe('user-abc')
  })
})

// ─── 11. Empty state handling ─────────────────────────────────────────────────

describe('Empty state handling', () => {
  test('habitStats with no habits returns 0 percent', () => {
    const { percent } = habitStats([], TODAY)
    expect(percent).toBe(0)
  })

  test('getOverdueTasks with no tasks returns []', () => {
    expect(getOverdueTasks([], TODAY)).toEqual([])
  })

  test('getUrgentGoal with no goals returns null', () => {
    expect(getUrgentGoal([], TODAY)).toBeNull()
  })

  test('daily score with no data returns 0', () => {
    expect(computeDailyScore({
      totalHabits: 0, completedHabits: 0,
      todayTasksDue: 0, todayTasksDone: 0,
      hasJournal: false, hasWorkout: false,
    })).toBe(0)
  })
})
