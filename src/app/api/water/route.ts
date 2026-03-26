import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { WaterLog } from '@/models/WaterLog'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_WATER_LOGS } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (isDemoUser(payload.userId)) return NextResponse.json(DEMO_WATER_LOGS)
    await connectDB()
    const items = await WaterLog.find({ userId: payload.userId }).sort({ date: -1 }).limit(30)
    return NextResponse.json(items)
  } catch (e) {
    console.error('GET /api/water error:', e)
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
    const item = await WaterLog.findOneAndUpdate(
      { userId: payload.userId, date: body.date },
      { ...body, userId: payload.userId },
      { new: true, upsert: true }
    )
    return NextResponse.json(item)
  } catch (e) {
    console.error('POST /api/water error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
