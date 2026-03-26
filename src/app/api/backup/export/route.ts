import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_HABITS, DEMO_JOURNAL, DEMO_WORKOUTS, DEMO_MEALS, DEMO_TASKS, DEMO_GOALS } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (isDemoUser(payload.userId)) {
      return NextResponse.json({
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

    await connectDB()

    const { Habit } = await import('@/models/Habit')
    const { Journal } = await import('@/models/Journal')
    const { Workout } = await import('@/models/Workout')
    const { Meal } = await import('@/models/Meal')
    const { Task } = await import('@/models/Task')
    const { Goal } = await import('@/models/Goal')

    const uid = payload.userId

    const [habits, journal, workouts, meals, tasks, goals] = await Promise.all([
      Habit.find({ userId: uid }).lean(),
      Journal.find({ userId: uid }).lean(),
      Workout.find({ userId: uid }).lean(),
      Meal.find({ userId: uid }).lean(),
      Task.find({ userId: uid }).lean(),
      Goal.find({ userId: uid }).lean(),
    ])

    return NextResponse.json({
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: { habits, journal, workouts, meals, tasks, goals },
    })
  } catch (e) {
    console.error('GET /api/backup/export error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
