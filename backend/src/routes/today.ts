/**
 * GET /api/today
 *
 * Returns a concise "today summary" for the authenticated user.
 * Aggregates data from multiple collections without duplicating
 * any data structures — reads directly from existing models.
 *
 * Response shape is designed to be stable; new fields can be added
 * without breaking existing callers.
 *
 * Architecture note:
 * All queries are fanned out in parallel and use the same userId
 * scoping pattern used across the rest of the API.
 */

import { Router } from 'express'
import mongoose from 'mongoose'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { Task }    from '../models/Task'
import { Goal }    from '../models/Goal'
import { Habit }   from '../models/Habit'
import { Journal } from '../models/Journal'
import { Capture } from '../models/Capture'
import { Project } from '../models/Project'

const router = Router()
router.use(authMiddleware)

/** Produce a YYYY-MM-DD string for a given Date in local context.
 *  The server runs in UTC so we accept an optional timezone offset
 *  query param (minutes behind UTC, e.g. 330 for IST = UTC+5:30).
 */
function localDateString(offsetMinutes: number): string {
  const now = new Date()
  const local = new Date(now.getTime() + offsetMinutes * 60000)
  return local.toISOString().slice(0, 10)
}

/**
 * GET /api/today?tz=330
 *
 * tz: timezone offset in minutes AHEAD of UTC (e.g. 330 for UTC+5:30).
 *     Defaults to 0 (UTC) if omitted. Range: -840 to 840.
 */
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId    = req.user!.userId
    const userObjId = new mongoose.Types.ObjectId(userId)

    // Parse timezone offset — caller provides minutes ahead of UTC
    const rawTz = parseInt(req.query.tz as string, 10)
    const tzOffset = isNaN(rawTz) ? 0 : Math.max(-840, Math.min(840, rawTz))
    const today = localDateString(tzOffset)

    // ── Fan out all queries in parallel ──────────────────────────────────
    const [tasks, goals, habits, journal, captures, projects] = await Promise.all([
      Task.find({ userId: userObjId }).lean(),
      Goal.find({ userId: userObjId }).lean(),
      Habit.find({ userId: userObjId }).lean(),
      Journal.findOne({ userId: userObjId, date: today }).lean(),
      Capture.find({ userId: userObjId, processed: false })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Project.find({ userId: userObjId, status: 'active' }).lean(),
    ])

    // ── Task aggregations ────────────────────────────────────────────────
    const todayTasks   = tasks.filter(t => t.dueDate && t.dueDate.slice(0, 10) === today)
    const overdueTasks = tasks
      .filter(t => t.status !== 'done' && t.dueDate && t.dueDate.slice(0, 10) < today)
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))

    // ── Habit aggregations ───────────────────────────────────────────────
    const habitsTotal     = habits.length
    const habitsCompleted = habits.filter(h => (h.completedDates || []).includes(today)).length
    const habitsPending   = habitsTotal - habitsCompleted

    // ── Goal aggregations ────────────────────────────────────────────────
    const in7Days = localDateString(tzOffset + 7 * 24 * 60) // 7 days ahead
    const goalsDeadlineSoon = goals.filter(g =>
      g.status === 'active' && g.deadline &&
      g.deadline >= today && g.deadline <= in7Days
    )

    // Nearest-deadline active goal
    const urgentGoal = (() => {
      const withDeadline = goals
        .filter(g => g.status === 'active' && g.deadline && g.deadline >= today && g.target > 0)
        .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))
      if (withDeadline.length > 0) return withDeadline[0]
      const active = goals.filter(g => g.status === 'active' && g.target > 0)
      if (active.length === 0) return null
      return active.reduce((best, g) =>
        g.progress / g.target > best.progress / best.target ? g : best
      )
    })()

    // ── Inbox ────────────────────────────────────────────────────────────
    const inboxTotal = await Capture.countDocuments({ userId: userObjId, processed: false })

    // ── Projects ─────────────────────────────────────────────────────────
    const activeProjects = projects
      .sort((a, b) => {
        if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
        if (a.deadline) return -1
        if (b.deadline) return 1
        return a.progress - b.progress
      })
      .slice(0, 3)

    // ── Build response ───────────────────────────────────────────────────
    return res.json({
      date: today,
      tasks: {
        today: {
          total: todayTasks.length,
          done:  todayTasks.filter(t => t.status === 'done').length,
          open:  todayTasks.filter(t => t.status !== 'done'),
        },
        overdue: overdueTasks.slice(0, 5),
        overdueTotalCount: overdueTasks.length,
      },
      habits: {
        total:     habitsTotal,
        completed: habitsCompleted,
        pending:   habitsPending,
        percent:   habitsTotal > 0 ? Math.round((habitsCompleted / habitsTotal) * 100) : 0,
      },
      goals: {
        activeCount:     goals.filter(g => g.status === 'active').length,
        completedCount:  goals.filter(g => g.status === 'completed').length,
        deadlineSoon:    goalsDeadlineSoon,
        urgentGoal,
      },
      journal: journal
        ? { exists: true, title: journal.title, mood: journal.mood, date: journal.date }
        : { exists: false },
      inbox: {
        count:   inboxTotal,
        preview: captures.map(c => ({ id: c._id, text: c.text.slice(0, 80), type: c.type })),
      },
      projects: activeProjects.map(p => ({
        id: p._id,
        name: p.name,
        status: p.status,
        progress: p.progress,
        deadline: p.deadline,
      })),
    })
  } catch (e) {
    console.error('GET /api/today error:', e)
    return res.status(500).json({ error: 'Failed to build today summary' })
  }
})

export default router
