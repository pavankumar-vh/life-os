import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'
import { User } from '../models/User'
import { authMiddleware, AuthRequest, signToken, signMfaToken, verifyMfaToken } from '../lib/auth'
import { sendWelcomeEmail, sendPasswordResetEmail } from '../lib/mailer'
import { generateTotpSetup, verifyTotp, generateRecoveryCodes, verifyRecoveryCode } from '../lib/mfa'
import { encrypt, decrypt, isEncrypted } from '../lib/crypto'

const router = Router()

// ─── Rate limiters ─────────────────────────────────────────────────────────

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

const mfaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many MFA attempts, please try again later' },
})

// ─── Registration ──────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (
      !name || !email || !password ||
      typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string'
    ) {
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

    // Non-blocking — don't fail registration if email fails
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

// ─── Login ─────────────────────────────────────────────────────────────────

// POST /api/auth/login
// If MFA is enabled, responds with { requiresMfa: true, mfaToken } instead of a session token.
// The client must then call POST /api/auth/mfa/verify with the mfaToken + OTP code.
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const sanitizedEmail = email.trim().toLowerCase()
    const user = await User.findOne({ email: sanitizedEmail }).select('+mfaEnabled')
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    if (!user.password) {
      return res.status(401).json({
        error: 'This account has no password set. Use "Forgot Password" to set one.',
      })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' })

    // If MFA is enabled, issue a short-lived challenge token instead of a session
    if (user.mfaEnabled) {
      const mfaToken = signMfaToken({ userId: user._id.toString(), email: user.email })
      return res.json({ requiresMfa: true, mfaToken })
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

// ─── Password Reset ─────────────────────────────────────────────────────────

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

// ─── Me ────────────────────────────────────────────────────────────────────

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!.userId).select('-password -googleTokens -settings.aiKeys -mfaSecret -mfaPendingSecret -mfaRecoveryCodes')
    if (!user) return res.status(404).json({ error: 'User not found' })

    return res.json({
      _id: user._id,
      email: user.email,
      name: user.name,
      xp: user.xp,
      level: user.level,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt,
    })
  } catch (error) {
    console.error('Auth me error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
})

// ─── MFA: Setup ────────────────────────────────────────────────────────────
// Authenticated user requests TOTP enrollment.
// Generates a pending secret and returns QR + manual key.

// POST /api/auth/mfa/setup
router.post('/mfa/setup', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!.userId).select('+mfaEnabled +mfaPendingSecret')
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (user.mfaEnabled) {
      return res.status(409).json({ error: 'MFA is already enabled. Disable it first to re-enroll.' })
    }

    const { secret, otpauthUri, qrDataUri } = await generateTotpSetup(user.email)

    // Store encrypted pending secret — NOT yet active until verified
    const encryptedSecret = process.env.ENCRYPTION_KEY
      ? JSON.stringify(encrypt(secret))
      : secret

    user.mfaPendingSecret = encryptedSecret
    await user.save()

    return res.json({
      otpauthUri,
      qrDataUri,
      // Also return the manual entry key (base32) for users who can't scan QR
      manualKey: secret,
    })
  } catch (error) {
    console.error('MFA setup error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
})

// ─── MFA: Activate ─────────────────────────────────────────────────────────
// User proves they can generate valid OTPs, then MFA is activated.
// Recovery codes are generated and shown once.

// POST /api/auth/mfa/activate
router.post('/mfa/activate', authMiddleware, mfaLimiter, async (req: AuthRequest, res) => {
  try {
    const { totp: totpCode } = req.body
    if (!totpCode || typeof totpCode !== 'string') {
      return res.status(400).json({ error: 'OTP code required' })
    }

    const user = await User.findById(req.user!.userId)
      .select('+mfaEnabled +mfaPendingSecret +mfaSecret +mfaRecoveryCodes')
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (!user.mfaPendingSecret) {
      return res.status(400).json({ error: 'No pending MFA setup found. Call /mfa/setup first.' })
    }

    // Decrypt pending secret
    let pendingSecret: string
    try {
      const parsed = JSON.parse(user.mfaPendingSecret)
      pendingSecret = process.env.ENCRYPTION_KEY && isEncrypted(parsed)
        ? decrypt(parsed)
        : user.mfaPendingSecret
    } catch {
      pendingSecret = user.mfaPendingSecret
    }

    const valid = verifyTotp(pendingSecret, totpCode.trim())
    if (!valid) {
      return res.status(400).json({ error: 'Invalid OTP code. Please check your authenticator app and try again.' })
    }

    // Generate recovery codes — shown to user once, only hashes stored
    const { plaintext, hashes } = await generateRecoveryCodes()

    // Move pending → active secret
    user.mfaSecret        = user.mfaPendingSecret
    user.mfaPendingSecret = undefined
    user.mfaEnabled       = true
    user.mfaRecoveryCodes = hashes
    await user.save()

    return res.json({
      message: 'MFA enabled successfully.',
      recoveryCodes: plaintext, // Shown once — client must instruct user to save these
    })
  } catch (error) {
    console.error('MFA activate error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
})

// ─── MFA: Verify (complete login) ──────────────────────────────────────────
// Client sends mfaToken (from login response) + 6-digit OTP.
// Returns full session token on success.

// POST /api/auth/mfa/verify
router.post('/mfa/verify', mfaLimiter, async (req, res) => {
  try {
    const { mfaToken, totp: totpCode } = req.body
    if (!mfaToken || !totpCode || typeof mfaToken !== 'string' || typeof totpCode !== 'string') {
      return res.status(400).json({ error: 'mfaToken and OTP code required' })
    }

    const challenge = verifyMfaToken(mfaToken)
    if (!challenge) {
      return res.status(401).json({ error: 'Invalid or expired MFA session. Please log in again.' })
    }

    const user = await User.findById(challenge.userId)
      .select('+mfaEnabled +mfaSecret')
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Decrypt stored secret
    let secret: string
    try {
      const parsed = JSON.parse(user.mfaSecret)
      secret = process.env.ENCRYPTION_KEY && isEncrypted(parsed)
        ? decrypt(parsed)
        : user.mfaSecret
    } catch {
      secret = user.mfaSecret
    }

    const valid = verifyTotp(secret, totpCode.trim())
    if (!valid) {
      return res.status(401).json({ error: 'Invalid OTP code.' })
    }

    const token = signToken({ userId: user._id.toString(), email: user.email })
    return res.json({
      token,
      user: { _id: user._id, email: user.email, name: user.name, xp: user.xp, level: user.level },
    })
  } catch (error) {
    console.error('MFA verify error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
})

// ─── MFA: Recovery code login ───────────────────────────────────────────────
// Substitute for TOTP when the user cannot access their authenticator app.

// POST /api/auth/mfa/recovery
router.post('/mfa/recovery', mfaLimiter, async (req, res) => {
  try {
    const { mfaToken, recoveryCode } = req.body
    if (!mfaToken || !recoveryCode || typeof mfaToken !== 'string' || typeof recoveryCode !== 'string') {
      return res.status(400).json({ error: 'mfaToken and recovery code required' })
    }

    const challenge = verifyMfaToken(mfaToken)
    if (!challenge) {
      return res.status(401).json({ error: 'Invalid or expired MFA session. Please log in again.' })
    }

    const user = await User.findById(challenge.userId)
      .select('+mfaEnabled +mfaRecoveryCodes')
    if (!user || !user.mfaEnabled || !user.mfaRecoveryCodes?.length) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const codeIndex = await verifyRecoveryCode(recoveryCode, user.mfaRecoveryCodes)
    if (codeIndex === -1) {
      return res.status(401).json({ error: 'Invalid or already used recovery code.' })
    }

    // Invalidate the used code by setting it to empty string
    const updatedCodes = [...user.mfaRecoveryCodes]
    updatedCodes[codeIndex] = ''
    user.mfaRecoveryCodes = updatedCodes
    await user.save()

    const token = signToken({ userId: user._id.toString(), email: user.email })
    return res.json({
      token,
      user: { _id: user._id, email: user.email, name: user.name, xp: user.xp, level: user.level },
      remainingCodes: updatedCodes.filter(Boolean).length,
    })
  } catch (error) {
    console.error('MFA recovery error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
})

// ─── MFA: Status ────────────────────────────────────────────────────────────

// GET /api/auth/mfa/status
router.get('/mfa/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await User.findById(req.user!.userId).select('+mfaEnabled +mfaRecoveryCodes')
    if (!user) return res.status(404).json({ error: 'User not found' })

    const remainingCodes = user.mfaRecoveryCodes
      ? user.mfaRecoveryCodes.filter(Boolean).length
      : 0

    return res.json({
      enabled: user.mfaEnabled,
      remainingRecoveryCodes: remainingCodes,
    })
  } catch (error) {
    console.error('MFA status error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
})

// ─── MFA: Disable ───────────────────────────────────────────────────────────
// Requires current password + valid TOTP code.

// POST /api/auth/mfa/disable
router.post('/mfa/disable', authMiddleware, mfaLimiter, async (req: AuthRequest, res) => {
  try {
    const { password, totp: totpCode } = req.body
    if (!password || !totpCode || typeof password !== 'string' || typeof totpCode !== 'string') {
      return res.status(400).json({ error: 'Password and OTP code required' })
    }

    const user = await User.findById(req.user!.userId)
      .select('+password +mfaEnabled +mfaSecret +mfaRecoveryCodes +mfaPendingSecret')
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (!user.mfaEnabled) {
      return res.status(400).json({ error: 'MFA is not currently enabled.' })
    }

    if (!user.password) {
      return res.status(400).json({ error: 'No password set on this account.' })
    }

    const passwordValid = await bcrypt.compare(password, user.password)
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid password.' })
    }

    let secret: string
    try {
      const parsed = JSON.parse(user.mfaSecret!)
      secret = process.env.ENCRYPTION_KEY && isEncrypted(parsed)
        ? decrypt(parsed)
        : user.mfaSecret!
    } catch {
      secret = user.mfaSecret!
    }

    const totpValid = verifyTotp(secret, totpCode.trim())
    if (!totpValid) {
      return res.status(401).json({ error: 'Invalid OTP code.' })
    }

    user.mfaEnabled       = false
    user.mfaSecret        = undefined
    user.mfaPendingSecret = undefined
    user.mfaRecoveryCodes = undefined
    await user.save()

    return res.json({ message: 'MFA disabled successfully.' })
  } catch (error) {
    console.error('MFA disable error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
})

// ─── MFA: Regenerate recovery codes ────────────────────────────────────────
// Requires current password + valid TOTP. Old codes are immediately invalidated.

// POST /api/auth/mfa/regenerate
router.post('/mfa/regenerate', authMiddleware, mfaLimiter, async (req: AuthRequest, res) => {
  try {
    const { password, totp: totpCode } = req.body
    if (!password || !totpCode || typeof password !== 'string' || typeof totpCode !== 'string') {
      return res.status(400).json({ error: 'Password and OTP code required' })
    }

    const user = await User.findById(req.user!.userId)
      .select('+password +mfaEnabled +mfaSecret +mfaRecoveryCodes')
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (!user.mfaEnabled || !user.mfaSecret) {
      return res.status(400).json({ error: 'MFA is not currently enabled.' })
    }

    if (!user.password) {
      return res.status(400).json({ error: 'No password set on this account.' })
    }

    const passwordValid = await bcrypt.compare(password, user.password)
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid password.' })
    }

    let secret: string
    try {
      const parsed = JSON.parse(user.mfaSecret!)
      secret = process.env.ENCRYPTION_KEY && isEncrypted(parsed)
        ? decrypt(parsed)
        : user.mfaSecret!
    } catch {
      secret = user.mfaSecret!
    }

    const totpValid = verifyTotp(secret, totpCode.trim())
    if (!totpValid) {
      return res.status(401).json({ error: 'Invalid OTP code.' })
    }

    const { plaintext, hashes } = await generateRecoveryCodes()
    user.mfaRecoveryCodes = hashes
    await user.save()

    return res.json({
      message: 'Recovery codes regenerated. Previous codes are now invalid.',
      recoveryCodes: plaintext,
    })
  } catch (error) {
    console.error('MFA regenerate error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
