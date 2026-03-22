import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { Meal } from '@/models/Meal'
import { getUserFromRequest } from '@/lib/auth'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getUserFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const { id } = await params
  await Meal.findOneAndDelete({ _id: id, userId: payload.userId })
  return NextResponse.json({ success: true })
}
