import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { DEMO_HABITS, DEMO_JOURNAL, DEMO_WORKOUTS, DEMO_MEALS, DEMO_TASKS, DEMO_GOALS } from '../lib/demo-data'
import { Habit } from '../models/Habit'
import { Journal } from '../models/Journal'
import { Workout } from '../models/Workout'
import { Meal } from '../models/Meal'
import { Task } from '../models/Task'
import { Goal } from '../models/Goal'
import { audit } from '../lib/audit'

const router = Router()
router.use(authMiddleware)

// GET /api/backup/export
router.get('/export', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId

    if (isDemoUser(userId)) {
      return res.json({
        exportedAt: new Date().toISOString(),
        version: '1.0',
        data: {
          habits: DEMO_HABITS,
          journal: DEMO_JOURNAL,
          workouts: DEMO_WORKOUTS,
          meals: DEMO_MEALS,
          tasks: DEMO_TASKS,
          goals: DEMO_GOALS,
        },
      })
    }

    const uid = userId
    const [habits, journal, workouts, meals, tasks, goals] = await Promise.all([
      Habit.find({ userId: uid }).lean(),
      Journal.find({ userId: uid }).lean(),
      Workout.find({ userId: uid }).lean(),
      Meal.find({ userId: uid }).lean(),
      Task.find({ userId: uid }).lean(),
      Goal.find({ userId: uid }).lean(),
    ])

    return res.json({
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: { habits, journal, workouts, meals, tasks, goals },
    })
  } catch (e) {
    console.error('GET /api/backup/export error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/backup/import
router.post('/import', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId

    if (isDemoUser(userId)) {
      return res.json({ message: 'Import not available in demo mode', count: 0 })
    }

    const body = req.body
    if (!body.data || !body.version) {
      return res.status(400).json({ error: 'Invalid backup file format' })
    }

    const uid = userId
    const { data } = body
    let count = 0
    const MAX_ITEMS = 5000

    if (data.habits?.length) {
      for (const h of data.habits.slice(0, MAX_ITEMS)) {
        const { _id, userId: _, ...rest } = h
        await Habit.findOneAndUpdate({ userId: uid, name: rest.name }, { ...rest, userId: uid }, { upsert: true, new: true })
        count++
      }
    }
    if (data.journal?.length) {
      for (const j of data.journal.slice(0, MAX_ITEMS)) {
        const { _id, userId: _, ...rest } = j
        await Journal.findOneAndUpdate({ userId: uid, date: rest.date }, { ...rest, userId: uid }, { upsert: true, new: true })
        count++
      }
    }
    if (data.workouts?.length) {
      for (const w of data.workouts.slice(0, MAX_ITEMS)) {
        const { _id, userId: _, ...rest } = w
        await Workout.findOneAndUpdate({ userId: uid, date: rest.date, name: rest.name }, { ...rest, userId: uid }, { upsert: true, new: true })
        count++
      }
    }
    if (data.meals?.length) {
      for (const m of data.meals.slice(0, MAX_ITEMS)) {
        const { _id, userId: _, ...rest } = m
        await Meal.findOneAndUpdate({ userId: uid, date: rest.date, name: rest.name }, { ...rest, userId: uid }, { upsert: true, new: true })
        count++
      }
    }
    if (data.tasks?.length) {
      for (const t of data.tasks.slice(0, MAX_ITEMS)) {
        const { _id, userId: _, ...rest } = t
        await Task.findOneAndUpdate({ userId: uid, title: rest.title }, { ...rest, userId: uid }, { upsert: true, new: true })
        count++
      }
    }
    if (data.goals?.length) {
      for (const g of data.goals.slice(0, MAX_ITEMS)) {
        const { _id, userId: _, ...rest } = g
        await Goal.findOneAndUpdate({ userId: uid, title: rest.title }, { ...rest, userId: uid }, { upsert: true, new: true })
        count++
      }
    }

    audit(uid, 'create', 'backup_import', 'bulk', { after: { count, collections: Object.keys(data) } })
    return res.json({ message: `Successfully imported ${count} records`, count })
  } catch (e) {
    console.error('POST /api/backup/import error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
