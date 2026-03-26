import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Goal } from '@/models/Goal'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_GOALS } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (isDemoUser(payload.userId)) return NextResponse.json(DEMO_GOALS)

    await connectDB()
    const goals = await Goal.find({ userId: payload.userId }).sort({ createdAt: -1 })
    return NextResponse.json(goals)
  } catch (e) {
    console.error('GET /api/goals error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (isDemoUser(payload.userId)) {
      return NextResponse.json({ _id: `demo-${Date.now()}`, ...body, userId: payload.userId, progress: 0, status: 'active' }, { status: 201 })
    }

    await connectDB()
    const goal = await Goal.create({ ...body, userId: payload.userId })
    return NextResponse.json(goal, { status: 201 })
  } catch (e) {
    console.error('POST /api/goals error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
