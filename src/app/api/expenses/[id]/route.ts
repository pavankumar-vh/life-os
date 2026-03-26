import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Expense } from '@/models/Expense'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser } from '@/lib/demo-data'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    if (isDemoUser(payload.userId)) return NextResponse.json({ success: true })
    await connectDB()
    await Expense.findOneAndDelete({ _id: id, userId: payload.userId })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/expenses/[id] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
