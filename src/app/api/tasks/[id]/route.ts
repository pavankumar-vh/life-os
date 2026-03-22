import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Task } from '@/models/Task'
import { User } from '@/models/User'
import { getUserFromRequest } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { id } = await params
  const body = await req.json()

  const oldTask = await Task.findOne({ _id: id, userId: payload.userId })
  const task = await Task.findOneAndUpdate(
    { _id: id, userId: payload.userId },
    body,
    { new: true }
  )
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Award XP when completing a task
  if (oldTask && oldTask.status !== 'done' && body.status === 'done') {
    await User.findByIdAndUpdate(payload.userId, { $inc: { xp: 15 } })
  }

  return NextResponse.json(task)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { id } = await params
  await Task.findOneAndDelete({ _id: id, userId: payload.userId })
  return NextResponse.json({ success: true })
}
