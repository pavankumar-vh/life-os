import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Goal } from '@/models/Goal'
import { User } from '@/models/User'
import { getUserFromRequest } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { id } = await params
  const body = await req.json()

  const oldGoal = await Goal.findOne({ _id: id, userId: payload.userId })
  const goal = await Goal.findOneAndUpdate(
    { _id: id, userId: payload.userId },
    body,
    { new: true }
  )
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Award XP when completing a goal
  if (oldGoal && oldGoal.status !== 'completed' && body.status === 'completed') {
    await User.findByIdAndUpdate(payload.userId, { $inc: { xp: 50 } })
  }

  return NextResponse.json(goal)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { id } = await params
  await Goal.findOneAndDelete({ _id: id, userId: payload.userId })
  return NextResponse.json({ success: true })
}
