import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { toISODate } from '../lib/utils'
import { DEMO_HABITS, DEMO_JOURNAL, DEMO_WORKOUTS, DEMO_MEALS, DEMO_TASKS, DEMO_GOALS } from '../lib/demo-data'
import { Habit } from '../models/Habit'
import { Journal } from '../models/Journal'
import { Workout } from '../models/Workout'
import { Meal } from '../models/Meal'
import { Task } from '../models/Task'
import { Goal } from '../models/Goal'

const router = Router()
router.use(authMiddleware)

interface TimelineEvent {
  type: string
  date: string
  title: string
  subtitle?: string
  icon: string
  color: string
  data?: Record<string, unknown>
}

function buildDemoTimeline(from: string, to: string): TimelineEvent[] {
  const events: TimelineEvent[] = []

  for (const habit of DEMO_HABITS) {
    for (const d of habit.completedDates) {
      if (d >= from && d <= to) {
        events.push({
          type: 'habit',
          date: d,
          title: habit.name,
          subtitle: 'Completed',
          icon: habit.icon,
          color: habit.color,
          data: {
            id: habit._id,
            completedDate: d,
            name: habit.name,
            icon: habit.icon,
            color: habit.color,
            frequency: habit.frequency,
          },
        })
      }
    }
  }
  for (const entry of DEMO_JOURNAL) {
    if (entry.date >= from && entry.date <= to) {
      events.push({
        type: 'journal',
        date: entry.date,
        title: entry.title,
        subtitle: `Mood: ${entry.mood}/5`,
        icon: 'book-open',
        color: '#e8d5b7',
        data: {
          id: entry._id,
          date: entry.date,
          title: entry.title,
          content: entry.content,
          mood: entry.mood,
          tags: entry.tags,
        },
      })
    }
  }
  for (const w of DEMO_WORKOUTS) {
    if (w.date >= from && w.date <= to) {
      events.push({
        type: 'workout',
        date: w.date,
        title: w.name,
        subtitle: `${w.duration}min`,
        icon: 'dumbbell',
        color: '#4ade80',
        data: {
          id: w._id,
          date: w.date,
          name: w.name,
          duration: w.duration,
          notes: w.notes,
          exercises: w.exercises,
        },
      })
    }
  }
  for (const m of DEMO_MEALS) {
    if (m.date >= from && m.date <= to) {
      events.push({
        type: 'meal',
        date: m.date,
        title: m.name,
        subtitle: `${m.calories} kcal`,
        icon: 'utensils',
        color: '#fb923c',
        data: {
          id: m._id,
          date: m.date,
          name: m.name,
          type: m.type,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          fiber: m.fiber,
          sugar: m.sugar,
        },
      })
    }
  }
  for (const t of DEMO_TASKS) {
    if (t.dueDate && t.dueDate >= from && t.dueDate <= to) {
      events.push({
        type: 'task',
        date: t.dueDate,
        title: t.title,
        subtitle: t.status,
        icon: 'check-square',
        color: '#60a5fa',
        data: {
          id: t._id,
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate,
          goalId: t.goalId,
        },
      })
    }
  }
  for (const g of DEMO_GOALS) {
    if (g.deadline && g.deadline >= from && g.deadline <= to) {
      events.push({
        type: 'goal',
        date: g.deadline,
        title: g.title,
        subtitle: `${g.progress}/${g.target} ${g.unit}`,
        icon: 'target',
        color: '#a78bfa',
        data: {
          id: g._id,
          title: g.title,
          description: g.description,
          category: g.category,
          progress: g.progress,
          target: g.target,
          unit: g.unit,
          deadline: g.deadline,
          status: g.status,
        },
      })
    }
  }

  return events.sort((a, b) => b.date.localeCompare(a.date))
}

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    const rawFrom = req.query.from as string
    const rawTo = req.query.to as string
    const from = (rawFrom && dateRegex.test(rawFrom)) ? rawFrom : toISODate(new Date(Date.now() - 30 * 86400000))
    const to = (rawTo && dateRegex.test(rawTo)) ? rawTo : toISODate()

    if (isDemoUser(userId)) {
      return res.json(buildDemoTimeline(from, to))
    }

    const events: TimelineEvent[] = []

    const habits = await Habit.find({ userId })
    for (const h of habits) {
      for (const d of h.completedDates || []) {
        if (d >= from && d <= to) {
          events.push({
            type: 'habit',
            date: d,
            title: h.name,
            subtitle: 'Completed',
            icon: h.icon || 'zap',
            color: h.color || '#4ade80',
            data: {
              id: h._id.toString(),
              completedDate: d,
              name: h.name,
              icon: h.icon,
              color: h.color,
              frequency: h.frequency,
            },
          })
        }
      }
    }

    const journals = await Journal.find({ userId, date: { $gte: from, $lte: to } })
    for (const j of journals) {
      events.push({
        type: 'journal',
        date: j.date,
        title: j.title,
        subtitle: `Mood: ${j.mood}/5`,
        icon: 'book-open',
        color: '#e8d5b7',
        data: {
          id: j._id.toString(),
          date: j.date,
          title: j.title,
          content: j.content,
          mood: j.mood,
          energy: j.energy,
          highlights: j.highlights,
          gratitude: j.gratitude,
          improvements: j.improvements,
          tags: j.tags,
          photos: j.photos,
        },
      })
    }

    const workouts = await Workout.find({ userId, date: { $gte: from, $lte: to } })
    for (const w of workouts) {
      events.push({
        type: 'workout',
        date: w.date,
        title: w.name,
        subtitle: `${w.duration}min`,
        icon: 'dumbbell',
        color: '#4ade80',
        data: {
          id: w._id.toString(),
          date: w.date,
          name: w.name,
          duration: w.duration,
          notes: w.notes,
          exercises: w.exercises,
          photos: w.photos,
        },
      })
    }

    const meals = await Meal.find({ userId, date: { $gte: from, $lte: to } })
    for (const m of meals) {
      events.push({
        type: 'meal',
        date: m.date,
        title: m.name,
        subtitle: `${m.calories} kcal`,
        icon: 'utensils',
        color: '#fb923c',
        data: {
          id: m._id.toString(),
          date: m.date,
          name: m.name,
          type: m.type,
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          fiber: m.fiber,
          sugar: m.sugar,
        },
      })
    }

    const tasks = await Task.find({ userId, dueDate: { $gte: from, $lte: to } })
    for (const t of tasks) {
      events.push({
        type: 'task',
        date: t.dueDate!,
        title: t.title,
        subtitle: t.status,
        icon: 'check-square',
        color: '#60a5fa',
        data: {
          id: t._id.toString(),
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate,
          goalId: t.goalId?.toString() || null,
        },
      })
    }

    const goals = await Goal.find({ userId, deadline: { $gte: from, $lte: to } })
    for (const g of goals) {
      events.push({
        type: 'goal',
        date: g.deadline!,
        title: g.title,
        subtitle: `${g.progress}/${g.target} ${g.unit}`,
        icon: 'target',
        color: '#a78bfa',
        data: {
          id: g._id.toString(),
          title: g.title,
          description: g.description,
          category: g.category,
          progress: g.progress,
          target: g.target,
          unit: g.unit,
          deadline: g.deadline,
          status: g.status,
        },
      })
    }

    events.sort((a, b) => b.date.localeCompare(a.date))
    return res.json(events)
  } catch (e) {
    console.error('GET /api/timeline error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
