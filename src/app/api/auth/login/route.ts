import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { User } from '@/models/User'
import { signToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// Demo user for testing without MongoDB
const DEMO_USER = {
  _id: 'demo-user-001',
  email: 'demo@lifeos.dev',
  name: 'Volt',
  xp: 420,
  level: 5,
}
const DEMO_PASSWORD = 'demo123'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Demo login bypass
    if (email === DEMO_USER.email && password === DEMO_PASSWORD) {
      const token = signToken({ userId: DEMO_USER._id, email: DEMO_USER.email })
      return NextResponse.json({ token, user: DEMO_USER })
    }

    await connectDB()
    const user = await User.findOne({ email })
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = signToken({ userId: user._id.toString(), email: user.email })

    return NextResponse.json({
      token,
      user: { _id: user._id, email: user.email, name: user.name, xp: user.xp, level: user.level },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
