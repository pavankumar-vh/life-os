import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Flashcard } from '@/models/Flashcard'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_FLASHCARDS } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (isDemoUser(payload.userId)) return NextResponse.json(DEMO_FLASHCARDS)
    await connectDB()
    const items = await Flashcard.find({ userId: payload.userId }).sort({ nextReview: 1 })
    return NextResponse.json(items)
  } catch (e) {
    console.error('GET /api/flashcards error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    if (isDemoUser(payload.userId)) {
      return NextResponse.json({ _id: `demo-${Date.now()}`, ...body, userId: payload.userId, timesReviewed: 0, timesCorrect: 0 })
    }
    await connectDB()
    const item = await Flashcard.create({ ...body, userId: payload.userId })
    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    console.error('POST /api/flashcards error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
