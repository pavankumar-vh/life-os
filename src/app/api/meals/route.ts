import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Meal } from '@/models/Meal'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_MEALS } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (isDemoUser(payload.userId)) {
      const url = new URL(req.url)
      const date = url.searchParams.get('date')
      return NextResponse.json(date ? DEMO_MEALS.filter((m) => m.date === date) : DEMO_MEALS)
    }

    await connectDB()
    const url = new URL(req.url)
    const date = url.searchParams.get('date')
    const query: Record<string, string> = { userId: payload.userId }
    if (date) query.date = date

    const meals = await Meal.find(query).sort({ createdAt: -1 }).limit(100)
    return NextResponse.json(meals)
  } catch (e) {
    console.error('GET /api/meals error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (isDemoUser(payload.userId)) {
      return NextResponse.json({ _id: `demo-${Date.now()}`, ...body, userId: payload.userId }, { status: 201 })
    }

    await connectDB()
    const meal = await Meal.create({ ...body, userId: payload.userId })
    return NextResponse.json(meal, { status: 201 })
  } catch (e) {
    console.error('POST /api/meals error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
