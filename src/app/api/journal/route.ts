import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Journal } from '@/models/Journal'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_JOURNAL } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (isDemoUser(payload.userId)) return NextResponse.json(DEMO_JOURNAL)

  await connectDB()
  const entries = await Journal.find({ userId: payload.userId }).sort({ date: -1 }).limit(100)
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const body = await req.json()

  // Upsert by date
  const entry = await Journal.findOneAndUpdate(
    { userId: payload.userId, date: body.date },
    { ...body, userId: payload.userId },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  return NextResponse.json(entry)
}
