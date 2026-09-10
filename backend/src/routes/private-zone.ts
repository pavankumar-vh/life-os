import { Router, Response } from 'express'
import argon2 from 'argon2'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { authMiddleware, AuthRequest, isDemoUser } from '../lib/auth'
import { User } from '../models/User'
import { VaultFile } from '../models/VaultFile'
import { generatePresignedDownloadUrl } from '../lib/b2'
import { audit } from '../lib/audit'

const router = Router()
router.use(authMiddleware)

const JWT_SECRET = process.env.JWT_SECRET as string

// Issue a 1-hour token for Private Zone access
function signPrivateZoneToken(userId: string): string {
  return jwt.sign({ privateZone: true, userId }, JWT_SECRET, { expiresIn: '1h' })
}

function verifyPrivateZoneToken(token: string, userId: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    return decoded.privateZone === true && decoded.userId === userId
  } catch {
    return false
  }
}

// Middleware to protect private zone endpoints
function privateZoneAuth(req: AuthRequest, res: Response, next: import('express').NextFunction): void {
  const token = req.headers['x-private-zone-token'] as string
  if (!token || !verifyPrivateZoneToken(token, req.user!.userId)) {
    res.status(401).json({ error: 'Private Zone locked or session expired' })
    return
  }
  next()
}

// POST /api/vault/private/setup
router.post('/setup', async (req: AuthRequest, res: Response) => {
  try {
    if (isDemoUser(req.user!.userId)) return res.status(400).json({ error: 'Demo user cannot use Private Zone' })

    const { password } = req.body
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const user = await User.findById(req.user!.userId).select('+privateZonePasswordHash')
    if (!user) return res.status(404).json({ error: 'User not found' })

    if (user.privateZonePasswordHash) {
      return res.status(400).json({ error: 'Private Zone is already set up' })
    }

    // Hash password
    const hash = await argon2.hash(password)

    // Generate 8 recovery codes
    const plainCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'))
    const hashedCodes = await Promise.all(plainCodes.map(code => argon2.hash(code)))

    user.privateZonePasswordHash = hash
    user.privateZoneRecoveryHash = JSON.stringify(hashedCodes)
    await user.save()

    audit(req.user!.userId, 'update', 'settings', 'private-zone-setup', { metadata: { action: 'setup_private_zone' } })

    return res.json({
      success: true,
      recoveryCodes: plainCodes, // ONLY shown once!
      message: 'Store these recovery codes securely. They will not be shown again.',
      token: signPrivateZoneToken(req.user!.userId)
    })
  } catch (e) {
    console.error('Private Zone Setup Error:', e)
    return res.status(500).json({ error: 'Failed to set up Private Zone' })
  }
})

// POST /api/vault/private/unlock
router.post('/unlock', async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body
    if (!password) return res.status(400).json({ error: 'Password required' })

    const user = await User.findById(req.user!.userId).select('+privateZonePasswordHash')
    if (!user || !user.privateZonePasswordHash) {
      return res.status(400).json({ error: 'Private Zone not set up' })
    }

    const isValid = await argon2.verify(user.privateZonePasswordHash, password)
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect Private Zone password' })
    }

    audit(req.user!.userId, 'update', 'auth', 'private-zone-unlock', { metadata: { action: 'unlock_private_zone' } })

    return res.json({ token: signPrivateZoneToken(req.user!.userId) })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to unlock Private Zone' })
  }
})

// POST /api/vault/private/recover
router.post('/recover', async (req: AuthRequest, res: Response) => {
  try {
    const { recoveryCode, newPassword } = req.body
    if (!recoveryCode || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Invalid input' })
    }

    const user = await User.findById(req.user!.userId).select('+privateZoneRecoveryHash')
    if (!user || !user.privateZoneRecoveryHash) {
      return res.status(400).json({ error: 'Private Zone not set up' })
    }

    let hashedCodes: string[] = []
    try {
      hashedCodes = JSON.parse(user.privateZoneRecoveryHash)
    } catch {
      return res.status(500).json({ error: 'Corrupt recovery codes' })
    }

    let matchedIndex = -1
    for (let i = 0; i < hashedCodes.length; i++) {
      if (await argon2.verify(hashedCodes[i], recoveryCode)) {
        matchedIndex = i
        break
      }
    }

    if (matchedIndex === -1) {
      return res.status(401).json({ error: 'Invalid recovery code' })
    }

    // Invalidate the used code
    hashedCodes.splice(matchedIndex, 1)

    // Hash the new password
    const newHash = await argon2.hash(newPassword)

    user.privateZonePasswordHash = newHash
    user.privateZoneRecoveryHash = JSON.stringify(hashedCodes)
    await user.save()

    audit(req.user!.userId, 'update', 'settings', 'private-zone-recover', { metadata: { action: 'recover_private_zone' } })

    return res.json({ success: true, token: signPrivateZoneToken(req.user!.userId) })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to recover Private Zone' })
  }
})

// GET /api/vault/private/files
router.get('/files', privateZoneAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { folder, search } = req.query
    const query: Record<string, unknown> = { userId: req.user!.userId, visibility: 'private' }
    if (folder && folder !== 'Root') query.folder = folder
    if (search) query.name = { $regex: search, $options: 'i' }
    
    const files = await VaultFile.find(query).sort({ createdAt: -1 }).lean()
    
    const withUrls = await Promise.all(
      files.map(async f => ({
        ...f,
        url: await generatePresignedDownloadUrl(f.key)
      }))
    )
    return res.json(withUrls)
  } catch (e) {
    return res.status(500).json({ error: 'Failed to list private files' })
  }
})

// PATCH /api/vault/private/:id - toggle visibility
router.patch('/:id/visibility', async (req: AuthRequest, res: Response) => {
  try {
    const { visibility } = req.body
    if (visibility !== 'standard' && visibility !== 'private') {
      return res.status(400).json({ error: 'Invalid visibility' })
    }

    if (visibility === 'standard') {
      const token = req.headers['x-private-zone-token'] as string
      if (!token || !verifyPrivateZoneToken(token, req.user!.userId)) {
        return res.status(401).json({ error: 'Private Zone locked' })
      }
    }

    const file = await VaultFile.findOne({ _id: req.params.id, userId: req.user!.userId })
    if (!file) return res.status(404).json({ error: 'File not found' })

    file.visibility = visibility
    await file.save()

    audit(req.user!.userId, 'update', 'vault', file.id, { metadata: { action: 'change_visibility', visibility } })
    return res.json({ success: true })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to change visibility' })
  }
})

export default router
