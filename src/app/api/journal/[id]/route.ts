import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Journal } from '@/models/Journal'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser } from '@/lib/demo-data'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (isDemoUser(payload.userId)) return NextResponse.json({ success: true })

    await connectDB()
    const { id } = await params
    await Journal.findOneAndDelete({ _id: id, userId: payload.userId })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/journal/[id] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
