import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Workout } from '@/models/Workout'
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
    const workout = await Workout.findOneAndUpdate(
      { _id: id, userId: payload.userId },
      body,
      { new: true }
    )
    if (!workout) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(workout)
  } catch (e) {
    console.error('PUT /api/workouts/[id] error:', e)
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
    await Workout.findOneAndDelete({ _id: id, userId: payload.userId })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/workouts/[id] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
