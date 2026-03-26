import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_HABITS, DEMO_JOURNAL, DEMO_WORKOUTS, DEMO_MEALS, DEMO_TASKS, DEMO_GOALS } from '@/lib/demo-data'
import { toISODate } from '@/lib/utils'

function buildDemoTimeline(from: string, to: string) {
  const events: Array<{ type: string; date: string; title: string; subtitle?: string; icon: string; color: string }> = []

  // Habits
  for (const habit of DEMO_HABITS) {
    for (const d of habit.completedDates) {
      if (d >= from && d <= to) {
        events.push({ type: 'habit', date: d, title: habit.name, subtitle: 'Completed', icon: habit.icon, color: habit.color })
      }
    }
  }
  // Journal
  for (const entry of DEMO_JOURNAL) {
    if (entry.date >= from && entry.date <= to) {
      events.push({ type: 'journal', date: entry.date, title: entry.title, subtitle: `Mood: ${entry.mood}/5`, icon: 'book-open', color: '#e8d5b7' })
    }
  }
  // Workouts
  for (const w of DEMO_WORKOUTS) {
    if (w.date >= from && w.date <= to) {
      events.push({ type: 'workout', date: w.date, title: w.name, subtitle: `${w.duration}min · ${w.exercises.length} exercises`, icon: 'dumbbell', color: '#4ade80' })
    }
  }
  // Meals
  for (const m of DEMO_MEALS) {
    if (m.date >= from && m.date <= to) {
      events.push({ type: 'meal', date: m.date, title: m.name, subtitle: `${m.calories} kcal`, icon: 'utensils', color: '#fb923c' })
    }
  }
  // Tasks
  for (const t of DEMO_TASKS) {
    if (t.dueDate && t.dueDate >= from && t.dueDate <= to) {
      events.push({ type: 'task', date: t.dueDate, title: t.title, subtitle: t.status, icon: 'check-square', color: '#60a5fa' })
    }
  }
  // Goals with deadlines
  for (const g of DEMO_GOALS) {
    if (g.deadline && g.deadline >= from && g.deadline <= to) {
      events.push({ type: 'goal', date: g.deadline, title: g.title, subtitle: `${g.progress}/${g.target} ${g.unit}`, icon: 'target', color: '#a78bfa' })
    }
  }

  return events.sort((a, b) => b.date.localeCompare(a.date))
}

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const from = req.nextUrl.searchParams.get('from') || toISODate(new Date(Date.now() - 30 * 86400000))
    const to = req.nextUrl.searchParams.get('to') || toISODate()

    if (isDemoUser(payload.userId)) {
      return NextResponse.json(buildDemoTimeline(from, to))
    }

    await connectDB()

    // Import models dynamically
    const { Habit } = await import('@/models/Habit')
    const { Journal } = await import('@/models/Journal')
    const { Workout } = await import('@/models/Workout')
    const { Meal } = await import('@/models/Meal')
    const { Task } = await import('@/models/Task')
    const { Goal } = await import('@/models/Goal')

    const uid = payload.userId
    const events: Array<{ type: string; date: string; title: string; subtitle?: string; icon: string; color: string }> = []

    // Habits completed in range
    const habits = await Habit.find({ userId: uid })
    for (const h of habits) {
      for (const d of h.completedDates || []) {
        if (d >= from && d <= to) {
          events.push({ type: 'habit', date: d, title: h.name, subtitle: 'Completed', icon: h.icon || 'zap', color: h.color || '#4ade80' })
        }
      }
    }

    // Journal entries
    const journals = await Journal.find({ userId: uid, date: { $gte: from, $lte: to } })
    for (const j of journals) {
      events.push({ type: 'journal', date: j.date, title: j.title, subtitle: `Mood: ${j.mood}/5`, icon: 'book-open', color: '#e8d5b7' })
    }

    // Workouts
    const workouts = await Workout.find({ userId: uid, date: { $gte: from, $lte: to } })
    for (const w of workouts) {
      events.push({ type: 'workout', date: w.date, title: w.name, subtitle: `${w.duration}min`, icon: 'dumbbell', color: '#4ade80' })
    }

    // Meals
    const meals = await Meal.find({ userId: uid, date: { $gte: from, $lte: to } })
    for (const m of meals) {
      events.push({ type: 'meal', date: m.date, title: m.name, subtitle: `${m.calories} kcal`, icon: 'utensils', color: '#fb923c' })
    }

    // Tasks with due dates
    const tasks = await Task.find({ userId: uid, dueDate: { $gte: from, $lte: to } })
    for (const t of tasks) {
      events.push({ type: 'task', date: t.dueDate, title: t.title, subtitle: t.status, icon: 'check-square', color: '#60a5fa' })
    }

    // Goals with deadlines
    const goals = await Goal.find({ userId: uid, deadline: { $gte: from, $lte: to } })
    for (const g of goals) {
      events.push({ type: 'goal', date: g.deadline, title: g.title, subtitle: `${g.progress}/${g.target} ${g.unit}`, icon: 'target', color: '#a78bfa' })
    }

    events.sort((a, b) => b.date.localeCompare(a.date))
    return NextResponse.json(events)
  } catch (e) {
    console.error('GET /api/timeline error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
