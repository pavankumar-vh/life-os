import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Project } from '@/models/Project'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser, DEMO_PROJECTS } from '@/lib/demo-data'

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (isDemoUser(payload.userId)) return NextResponse.json(DEMO_PROJECTS)
    await connectDB()
    const items = await Project.find({ userId: payload.userId }).sort({ updatedAt: -1 })
    return NextResponse.json(items)
  } catch (e) {
    console.error('GET /api/projects error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = await req.json()
    if (isDemoUser(payload.userId)) {
      return NextResponse.json({ _id: `demo-${Date.now()}`, ...body, userId: payload.userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    }
    await connectDB()
    const item = await Project.create({ ...body, userId: payload.userId })
    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    console.error('POST /api/projects error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
