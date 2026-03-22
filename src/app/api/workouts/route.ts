import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Workout } from '@/models/Workout'
import { User } from '@/models/User'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_WORKOUTS } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isDemoUser(payload.userId)) return NextResponse.json(DEMO_WORKOUTS)

  await connectDB()
  const workouts = await Workout.find({ userId: payload.userId }).sort({ date: -1 }).limit(100)
  return NextResponse.json(workouts)
}

export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const body = await req.json()
  const workout = await Workout.create({ ...body, userId: payload.userId })

  // Award XP for workout
  await User.findByIdAndUpdate(payload.userId, { $inc: { xp: 25 } })

  return NextResponse.json(workout, { status: 201 })
}
