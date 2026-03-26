import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { BodyLog } from '@/models/BodyLog'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_BODY_LOGS } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (isDemoUser(payload.userId)) return NextResponse.json(DEMO_BODY_LOGS)
    await connectDB()
    const logs = await BodyLog.find({ userId: payload.userId }).sort({ date: -1 }).limit(100)
    return NextResponse.json(logs)
  } catch (e) {
    console.error('GET /api/body error:', e)
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
    const log = await BodyLog.findOneAndUpdate(
      { userId: payload.userId, date: body.date },
      { ...body, userId: payload.userId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )
    return NextResponse.json(log)
  } catch (e) {
    console.error('POST /api/body error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
