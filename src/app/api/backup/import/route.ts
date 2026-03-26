import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser } from '@/lib/demo-data'

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (isDemoUser(payload.userId)) {
      return NextResponse.json({ message: 'Import not available in demo mode', count: 0 })
    }

    const body = await req.json()

    if (!body.data || !body.version) {
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 })
    }

    await connectDB()

    const { Habit } = await import('@/models/Habit')
    const { Journal } = await import('@/models/Journal')
    const { Workout } = await import('@/models/Workout')
    const { Meal } = await import('@/models/Meal')
    const { Task } = await import('@/models/Task')
    const { Goal } = await import('@/models/Goal')

    const uid = payload.userId
    const { data } = body
    let count = 0

    // Import each collection - upsert to avoid duplicates
    if (data.habits?.length) {
      for (const h of data.habits) {
        const { _id, userId, ...rest } = h
        await Habit.findOneAndUpdate(
          { userId: uid, name: rest.name },
          { ...rest, userId: uid },
          { upsert: true, new: true }
        )
        count++
      }
    }

    if (data.journal?.length) {
      for (const j of data.journal) {
        const { _id, userId, ...rest } = j
        await Journal.findOneAndUpdate(
          { userId: uid, date: rest.date },
          { ...rest, userId: uid },
          { upsert: true, new: true }
        )
        count++
      }
    }

    if (data.workouts?.length) {
      for (const w of data.workouts) {
        const { _id, userId, ...rest } = w
        await Workout.findOneAndUpdate(
          { userId: uid, date: rest.date, name: rest.name },
          { ...rest, userId: uid },
          { upsert: true, new: true }
        )
        count++
      }
    }

    if (data.meals?.length) {
      for (const m of data.meals) {
        const { _id, userId, ...rest } = m
        await Meal.findOneAndUpdate(
          { userId: uid, date: rest.date, name: rest.name },
          { ...rest, userId: uid },
          { upsert: true, new: true }
        )
        count++
      }
    }

    if (data.tasks?.length) {
      for (const t of data.tasks) {
        const { _id, userId, ...rest } = t
        await Task.findOneAndUpdate(
          { userId: uid, title: rest.title },
          { ...rest, userId: uid },
          { upsert: true, new: true }
        )
        count++
      }
    }

    if (data.goals?.length) {
      for (const g of data.goals) {
        const { _id, userId, ...rest } = g
        await Goal.findOneAndUpdate(
          { userId: uid, title: rest.title },
          { ...rest, userId: uid },
          { upsert: true, new: true }
        )
        count++
      }
    }

    return NextResponse.json({ message: `Successfully imported ${count} records`, count })
  } catch (e) {
    console.error('POST /api/backup/import error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
