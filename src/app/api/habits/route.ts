import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Habit } from '@/models/Habit'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_HABITS } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isDemoUser(payload.userId)) return NextResponse.json(DEMO_HABITS)

  await connectDB()
  const habits = await Habit.find({ userId: payload.userId }).sort({ createdAt: -1 })
  return NextResponse.json(habits)
}

export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const body = await req.json()
  const habit = await Habit.create({ ...body, userId: payload.userId })
  return NextResponse.json(habit, { status: 201 })
}
