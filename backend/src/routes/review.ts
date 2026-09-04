import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { Task } from '../models/Task'
import { Habit } from '../models/Habit'
import { Workout } from '../models/Workout'
import { FocusSession } from '../models/FocusSession'
import { Goal } from '../models/Goal'
import { Project } from '../models/Project'
import { Expense } from '../models/Expense'
import { Journal } from '../models/Journal'
import { Capture } from '../models/Capture'

const router = Router()
router.use(authMiddleware)

/**
 * GET /api/review/weekly
 * Query params:
 *   start (YYYY-MM-DD)
 *   end   (YYYY-MM-DD)
 */
router.get('/weekly', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { start, end } = req.query

    if (!start || !end || typeof start !== 'string' || typeof end !== 'string') {
      return res.status(400).json({ error: 'start and end dates are required in YYYY-MM-DD format' })
    }

    if (isDemoUser(userId)) {
      // Stub for demo user
      return res.json({
        tasks: { completed: 5, remaining: 2, overdue: 1 },
        habits: { completedCount: 15, totalPossible: 21, completionRate: 71 },
        workouts: { count: 3, totalDuration: 135 },
        focus: { count: 8, totalDuration: 400 },
        goals: { activeCount: 3 },
        projects: { touchedCount: 2 },
        expenses: { totalAmount: 450, count: 5 },
        journal: { entryCount: 4, avgMood: 4.2 },
        captures: { count: 12, processedCount: 8 }
      })
    }

    // Run aggregations in parallel
    const [
      tasksDue,
      habitsAll,
      workoutsPeriod,
      focusPeriod,
      goalsActive,
      projectsTouched,
      expensesPeriod,
      journalPeriod,
      capturesPeriod
    ] = await Promise.all([
      // Tasks
      Task.find({ userId, dueDate: { $gte: start, $lte: end } }),
      // Habits
      Habit.find({ userId }),
      // Workouts
      Workout.find({ userId, date: { $gte: start, $lte: end } }),
      // Focus Sessions (createdAt for now, since it doesn't have a plain date field usually)
      FocusSession.find({ userId, createdAt: { $gte: new Date(start + 'T00:00:00Z'), $lte: new Date(end + 'T23:59:59Z') } }),
      // Goals
      Goal.find({ userId, status: 'active' }),
      // Projects (using updatedAt)
      Project.find({ userId, updatedAt: { $gte: new Date(start + 'T00:00:00Z'), $lte: new Date(end + 'T23:59:59Z') } }),
      // Expenses (assuming it has date field)
      Expense.find({ userId, date: { $gte: start, $lte: end } }),
      // Journal
      Journal.find({ userId, date: { $gte: start, $lte: end } }),
      // Captures
      Capture.find({ userId, createdAt: { $gte: new Date(start + 'T00:00:00Z'), $lte: new Date(end + 'T23:59:59Z') } })
    ])

    // --- Tasks ---
    let completedTasks = 0
    let remainingTasks = 0
    let overdueTasks = 0 // Overdue tasks strictly before today. For weekly review, if the end date is today or past, tasks with due dates in the week that aren't done.
    const endBound = new Date(end)
    const todayStr = new Date().toISOString().slice(0, 10)
    for (const t of tasksDue) {
      if (t.status === 'done') {
        completedTasks++
      } else {
        remainingTasks++
        // If due date is before today, it's overdue
        if (t.dueDate && t.dueDate < todayStr) overdueTasks++
      }
    }

    // --- Habits ---
    let habitCompletedCount = 0
    let habitTotalPossible = 0
    for (const h of habitsAll) {
      const dates = h.completedDates || []
      // Count completions in range
      for (const d of dates) {
        if (d >= start && d <= end) habitCompletedCount++
      }
      habitTotalPossible += 7 // Assuming a daily habit. If frequency exists, we could adjust.
    }
    const habitCompletionRate = habitTotalPossible > 0 ? Math.round((habitCompletedCount / habitTotalPossible) * 100) : 0

    // --- Workouts ---
    let workoutDuration = 0
    for (const w of workoutsPeriod) workoutDuration += (w.duration || 0)

    // --- Focus ---
    let focusDuration = 0
    for (const f of focusPeriod) focusDuration += (f.duration || 0)

    // --- Expenses ---
    let expenseTotal = 0
    for (const e of expensesPeriod) expenseTotal += (e.amount || 0)

    // --- Journal ---
    let moodSum = 0
    for (const j of journalPeriod) moodSum += (j.mood || 0)
    const avgMood = journalPeriod.length > 0 ? +(moodSum / journalPeriod.length).toFixed(1) : 0

    // --- Captures ---
    let processedCaptures = 0
    for (const c of capturesPeriod) {
      if (c.processed) processedCaptures++
    }

    return res.json({
      tasks: {
        completed: completedTasks,
        remaining: remainingTasks,
        overdue: overdueTasks,
        // Could also return the actual task titles for "What did I complete?"
        items: tasksDue.map(t => ({ id: t._id, title: t.title, status: t.status, dueDate: t.dueDate }))
      },
      habits: {
        completedCount: habitCompletedCount,
        totalPossible: habitTotalPossible,
        completionRate: habitCompletionRate
      },
      workouts: {
        count: workoutsPeriod.length,
        totalDuration: workoutDuration
      },
      focus: {
        count: focusPeriod.length,
        totalDuration: focusDuration
      },
      goals: {
        activeCount: goalsActive.length
      },
      projects: {
        touchedCount: projectsTouched.length
      },
      expenses: {
        count: expensesPeriod.length,
        totalAmount: expenseTotal
      },
      journal: {
        entryCount: journalPeriod.length,
        avgMood
      },
      captures: {
        count: capturesPeriod.length,
        processedCount: processedCaptures
      }
    })

  } catch (e) {
    console.error('GET /api/review/weekly error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
