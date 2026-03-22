import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/models/User'
import { getUserFromRequest } from '@/lib/auth'

const DEMO_USER = {
  _id: 'demo-user-001',
  email: 'demo@lifeos.dev',
  name: 'Volt',
  xp: 420,
  level: 5,
}

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Demo user bypass
    if (payload.userId === 'demo-user-001') {
      return NextResponse.json(DEMO_USER)
    }

    await connectDB()
    const user = await User.findById(payload.userId).select('-password')
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Auth me error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
