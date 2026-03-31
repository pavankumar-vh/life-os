import { Router } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { User } from '../models/User'
import { signToken, authMiddleware, AuthRequest } from '../lib/auth'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

const DEMO_USER = {
  _id: 'demo-user-001',
  email: 'demo@lifeos.dev',
  name: 'Volt',
  xp: 420,
  level: 5,
}
const DEMO_PASSWORD = 'demo123'

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const sanitizedEmail = email.trim().toLowerCase()

    if (sanitizedEmail === DEMO_USER.email && password === DEMO_PASSWORD) {
      const token = signToken({ userId: DEMO_USER._id, email: DEMO_USER.email })
      return res.json({ token, user: DEMO_USER })
    }

    const user = await User.findOne({ email: sanitizedEmail })
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = signToken({ userId: user._id.toString(), email: user.email })
    return res.json({
      token,
      user: { _id: user._id, email: user.email, name: user.name, xp: user.xp, level: user.level },
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password || typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'All fields required' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const sanitizedEmail = email.trim().toLowerCase()
    const sanitizedName = name.trim()

    const existing = await User.findOne({ email: sanitizedEmail })
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const hashed = await bcrypt.hash(password, 12)
    const user = await User.create({ name: sanitizedName, email: sanitizedEmail, password: hashed })

    const token = signToken({ userId: user._id.toString(), email: user.email })
    return res.status(201).json({
      token,
      user: { _id: user._id, email: user.email, name: user.name, xp: user.xp, level: user.level },
    })
  } catch (error) {
    console.error('Register error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId

    if (userId === 'demo-user-001') {
      return res.json(DEMO_USER)
    }

    const user = await User.findById(userId).select('-password')
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    return res.json(user)
  } catch (error) {
    console.error('Auth me error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
