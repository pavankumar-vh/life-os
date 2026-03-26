import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Goal } from '@/models/Goal'
import { User } from '@/models/User'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser } from '@/lib/demo-data'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    if (isDemoUser(payload.userId)) {
      return NextResponse.json({ _id: id, ...body, userId: payload.userId })
    }

    await connectDB()

    const oldGoal = await Goal.findOne({ _id: id, userId: payload.userId })
    const goal = await Goal.findOneAndUpdate(
      { _id: id, userId: payload.userId },
      body,
      { new: true }
    )
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (oldGoal && oldGoal.status !== 'completed' && body.status === 'completed') {
      await User.findByIdAndUpdate(payload.userId, { $inc: { xp: 50 } })
    }

    return NextResponse.json(goal)
  } catch (e) {
    console.error('PUT /api/goals/[id] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (isDemoUser(payload.userId)) return NextResponse.json({ success: true })

    await connectDB()
    const { id } = await params
    await Goal.findOneAndDelete({ _id: id, userId: payload.userId })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/goals/[id] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
