import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Workout } from '@/models/Workout'
import { User } from '@/models/User'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_WORKOUTS } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (isDemoUser(payload.userId)) return NextResponse.json(DEMO_WORKOUTS)

    await connectDB()
    const workouts = await Workout.find({ userId: payload.userId }).sort({ date: -1 }).limit(100)
    return NextResponse.json(workouts)
  } catch (e) {
    console.error('GET /api/workouts error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (isDemoUser(payload.userId)) {
      return NextResponse.json({ _id: `demo-${Date.now()}`, ...body, userId: payload.userId }, { status: 201 })
    }

    await connectDB()
    const workout = await Workout.create({ ...body, userId: payload.userId })
    await User.findByIdAndUpdate(payload.userId, { $inc: { xp: 25 } })
    return NextResponse.json(workout, { status: 201 })
  } catch (e) {
    console.error('POST /api/workouts error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
