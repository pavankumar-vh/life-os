import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Note } from '@/models/Note'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_NOTES } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (isDemoUser(payload.userId)) return NextResponse.json(DEMO_NOTES)
    await connectDB()
    const notes = await Note.find({ userId: payload.userId }).sort({ updatedAt: -1 })
    return NextResponse.json(notes)
  } catch (e) {
    console.error('GET /api/notes error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    if (isDemoUser(payload.userId)) {
      return NextResponse.json({
        _id: body._id || `demo-${Date.now()}`,
        ...body,
        userId: payload.userId,
        createdAt: body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
    await connectDB()
    let note
    if (body._id) {
      note = await Note.findOneAndUpdate(
        { _id: body._id, userId: payload.userId },
        { ...body, userId: payload.userId },
        { new: true }
      )
    }
    if (!note) {
      note = await Note.create({ ...body, userId: payload.userId })
    }
    return NextResponse.json(note)
  } catch (e) {
    console.error('POST /api/notes error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
