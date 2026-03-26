import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Habit } from '@/models/Habit'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_HABITS } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (isDemoUser(payload.userId)) return NextResponse.json(DEMO_HABITS)

    await connectDB()
    const habits = await Habit.find({ userId: payload.userId }).sort({ createdAt: -1 })
    return NextResponse.json(habits)
  } catch (e) {
    console.error('GET /api/habits error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (isDemoUser(payload.userId)) {
      return NextResponse.json({ _id: `demo-${Date.now()}`, ...body, userId: payload.userId, completedDates: [], streak: 0, bestStreak: 0 }, { status: 201 })
    }

    await connectDB()
    const habit = await Habit.create({ ...body, userId: payload.userId })
    return NextResponse.json(habit, { status: 201 })
  } catch (e) {
    console.error('POST /api/habits error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
