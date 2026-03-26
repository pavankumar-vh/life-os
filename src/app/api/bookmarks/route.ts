import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Bookmark } from '@/models/Bookmark'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_BOOKMARKS } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (isDemoUser(payload.userId)) return NextResponse.json(DEMO_BOOKMARKS)
    await connectDB()
    const items = await Bookmark.find({ userId: payload.userId }).sort({ createdAt: -1 })
    return NextResponse.json(items)
  } catch (e) {
    console.error('GET /api/bookmarks error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    if (isDemoUser(payload.userId)) {
      return NextResponse.json({ _id: `demo-${Date.now()}`, ...body, userId: payload.userId, createdAt: new Date().toISOString() })
    }
    await connectDB()
    const item = await Bookmark.create({ ...body, userId: payload.userId })
    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    console.error('POST /api/bookmarks error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
