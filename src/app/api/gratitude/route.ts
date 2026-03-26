import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Gratitude } from '@/models/Gratitude'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_GRATITUDE } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (isDemoUser(payload.userId)) return NextResponse.json(DEMO_GRATITUDE)
    await connectDB()
    const items = await Gratitude.find({ userId: payload.userId }).sort({ date: -1 })
    return NextResponse.json(items)
  } catch (e) {
    console.error('GET /api/gratitude error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    if (isDemoUser(payload.userId)) {
      return NextResponse.json({ _id: body._id || `demo-${Date.now()}`, ...body, userId: payload.userId })
    }
    await connectDB()
    if (body._id) {
      const item = await Gratitude.findOneAndUpdate({ _id: body._id, userId: payload.userId }, body, { new: true })
      return NextResponse.json(item)
    }
    const item = await Gratitude.create({ ...body, userId: payload.userId })
    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    console.error('POST /api/gratitude error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
