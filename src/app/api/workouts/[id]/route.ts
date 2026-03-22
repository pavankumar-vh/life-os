import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Workout } from '@/models/Workout'
import { getUserFromRequest } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { id } = await params
  const body = await req.json()
  const workout = await Workout.findOneAndUpdate(
    { _id: id, userId: payload.userId },
    body,
    { new: true }
  )
  if (!workout) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(workout)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { id } = await params
  await Workout.findOneAndDelete({ _id: id, userId: payload.userId })
  return NextResponse.json({ success: true })
}
