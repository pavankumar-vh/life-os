import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Goal } from '@/models/Goal'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_GOALS } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isDemoUser(payload.userId)) return NextResponse.json(DEMO_GOALS)

  await connectDB()
  const goals = await Goal.find({ userId: payload.userId }).sort({ createdAt: -1 })
  return NextResponse.json(goals)
}

export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const body = await req.json()
  const goal = await Goal.create({ ...body, userId: payload.userId })
  return NextResponse.json(goal, { status: 201 })
}
