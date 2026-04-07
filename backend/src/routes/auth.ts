import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import { User } from '../models/User'
import { authMiddleware, AuthRequest, signToken } from '../lib/auth'
import { sendWelcomeEmail, sendPasswordResetEmail } from '../lib/mailer'
import { getAuthUrl, getOAuth2Client } from '../lib/google'
import { google } from 'googleapis'

const router = Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many reset requests, please try again in an hour' },
})

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const sanitizedEmail = email.trim().toLowerCase()
    const user = await User.findOne({ email: sanitizedEmail })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

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
    const sanitizedName  = name.trim()

    const existing = await User.findOne({ email: sanitizedEmail })
    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const hashed = await bcrypt.hash(password, 12)
    const user   = await User.create({ name: sanitizedName, email: sanitizedEmail, password: hashed })

    const token = signToken({ userId: user._id.toString(), email: user.email })

    // Send welcome email (non-blocking — don't fail registration if email fails)
    sendWelcomeEmail(user.email, user.name).catch(() => {})

    return res.status(201).json({
      token,
      user: { _id: user._id, email: user.email, name: user.name, xp: user.xp, level: user.level },
    })
  } catch (error) {
    console.error('Register error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/forgot-password
router.post('/forgot-password', resetLimiter, async (req, res) => {
  try {
    const { email } = req.body
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email required' })
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() })

    // Always return success to avoid email enumeration
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' })
    }

    // Generate a secure token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')

    user.passwordResetToken   = hashedToken
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    await user.save()

    await sendPasswordResetEmail(user.email, user.name, resetToken)

    return res.json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (error) {
    console.error('Forgot password error:', error)
    return res.status(500).json({ error: 'Failed to send reset email. Please try again.' })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password || typeof token !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Token and new password required' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires')

    if (!user) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired.' })
    }

    user.password             = await bcrypt.hash(password, 12)
    user.passwordResetToken   = undefined
    user.passwordResetExpires = undefined
    await user.save()

    const jwtToken = signToken({ userId: user._id.toString(), email: user.email })
    return res.json({
      message: 'Password reset successfully.',
      token: jwtToken,
      user: { _id: user._id, email: user.email, name: user.name, xp: user.xp, level: user.level },
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!.userId).select('-password -googleTokens -settings.aiKeys')
    if (!user) return res.status(404).json({ error: 'User not found' })

    return res.json({
      _id: user._id,
      email: user.email,
      name: user.name,
      xp: user.xp,
      level: user.level,
      createdAt: user.createdAt,
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/google/url
router.get('/google/url', (req, res) => {
  try {
    const customUri = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/auth/google/callback` : undefined
    const url = getAuthUrl('login', customUri)
    return res.json({ url })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate Google URL' })
  }
})

// POST /api/auth/google/callback
router.post('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.body
    if (!code) return res.status(400).json({ error: 'Code required' })
    if (state !== 'login') return res.status(400).json({ error: 'Invalid state' })

    const customUri = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/auth/google/callback` : undefined
    const client = getOAuth2Client(customUri)
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)
    
    // Get user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: client })
    const userInfo = await oauth2.userinfo.get()

    if (!userInfo.data.email) {
      return res.status(400).json({ error: 'Email not provided by Google' })
    }

    let user = await User.findOne({ email: userInfo.data.email })
    if (!user) {
      // Register new user without password
      user = new User({
        email: userInfo.data.email,
        name: userInfo.data.name || userInfo.data.email.split('@')[0],
      })
      await user.save()
    }

    const token = signToken({ userId: user._id.toString(), email: user.email })
    return res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        xp: user.xp,
        level: user.level,
      }
    })
  } catch (error: any) {
    console.error('Google login error:', error)
    return res.status(500).json({ error: 'Failed to complete Google Sign In' })
  }
})

export default router
