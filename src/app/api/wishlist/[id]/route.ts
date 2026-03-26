import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { WishlistItem } from '@/models/WishlistItem'
import { getUserFromRequest } from '@/lib/auth'
import { isDemoUser } from '@/lib/demo-data'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    const body = await req.json()
    if (isDemoUser(payload.userId)) {
      return NextResponse.json({ _id: id, ...body, userId: payload.userId })
    }
    await connectDB()
    const item = await WishlistItem.findOneAndUpdate({ _id: id, userId: payload.userId }, body, { new: true })
    return NextResponse.json(item)
  } catch (e) {
    console.error('PUT /api/wishlist/[id] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await params
    if (isDemoUser(payload.userId)) return NextResponse.json({ success: true })
    await connectDB()
    await WishlistItem.findOneAndDelete({ _id: id, userId: payload.userId })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/wishlist/[id] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
