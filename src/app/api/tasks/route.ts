import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Task } from '@/models/Task'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_TASKS } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isDemoUser(payload.userId)) return NextResponse.json(DEMO_TASKS)

  await connectDB()
  const tasks = await Task.find({ userId: payload.userId }).sort({ createdAt: -1 })
  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const body = await req.json()
  const task = await Task.create({ ...body, userId: payload.userId })
  return NextResponse.json(task, { status: 201 })
}
