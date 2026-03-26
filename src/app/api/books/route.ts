import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Book } from '@/models/Book'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_BOOKS } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (isDemoUser(payload.userId)) return NextResponse.json(DEMO_BOOKS)
    await connectDB()
    const items = await Book.find({ userId: payload.userId }).sort({ createdAt: -1 })
    return NextResponse.json(items)
  } catch (e) {
    console.error('GET /api/books error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    if (isDemoUser(payload.userId)) {
      return NextResponse.json({ _id: `demo-${Date.now()}`, ...body, userId: payload.userId })
    }
    await connectDB()
    const item = await Book.create({ ...body, userId: payload.userId })
    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    console.error('POST /api/books error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
