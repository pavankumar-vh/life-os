import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { User } from '../models/User'
import { audit } from '../lib/audit'
import { encrypt, decrypt, isEncrypted } from '../lib/crypto'

const router = Router()
router.use(authMiddleware)

const DEFAULT_SETTINGS = {
  accentColor: '#e8d5b7',
  goals: { calories: 2200, protein: 150, carbs: 250, fat: 70, water: 8, sleep: 8, steps: 10000, workoutsPerWeek: 4 },
  aiProvider: 'openai',
  aiModels: {},
  aiKeys: {},
  lastBackup: null,
}

// GET /api/settings
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEFAULT_SETTINGS)
    const user = await User.findById(userId).select('settings').lean()
    const settings = user?.settings || DEFAULT_SETTINGS

    // Decrypt AI keys then mask — only return last 4 chars for display
    const maskedKeys: Record<string, string> = {}
    if (settings.aiKeys) {
      for (const [k, v] of Object.entries(settings.aiKeys as Record<string, unknown>)) {
        if (!v) { maskedKeys[k] = ''; continue }
        try {
          const plain = isEncrypted(v) ? decrypt(v) : String(v)
          maskedKeys[k] = plain ? `...${plain.slice(-4)}` : ''
        } catch {
          maskedKeys[k] = '****' // decryption failed but key exists
        }
      }
    }
    return res.json({ ...settings, aiKeys: maskedKeys })
  } catch (e) {
    console.error('GET /api/settings error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/settings
router.put('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(req.body)

    const allowed = ['accentColor', 'goals', 'aiProvider', 'aiModels', 'aiKeys', 'lastBackup']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[`settings.${key}`] = req.body[key]
      }
    }

    // For aiKeys — decrypt existing, merge with incoming (only real values), re-encrypt all
    if (updates['settings.aiKeys']) {
      const incoming = updates['settings.aiKeys'] as Record<string, string>
      const existingRaw = (await User.findById(userId).select('settings.aiKeys').lean())
        ?.settings?.aiKeys as Record<string, unknown> || {}

      // Decrypt existing keys
      const existingDecrypted: Record<string, string> = {}
      for (const [k, v] of Object.entries(existingRaw)) {
        try {
          existingDecrypted[k] = isEncrypted(v) ? decrypt(v) : String(v)
        } catch { /* skip corrupted */ }
      }

      // Merge
      const merged: Record<string, string> = { ...existingDecrypted }
      for (const [provider, value] of Object.entries(incoming)) {
        if (value && !value.startsWith('...')) {
          merged[provider] = value
        } else if (value === '') {
          delete merged[provider]
        }
        // Skip masked values — keep existing
      }

      // Encrypt all keys before saving
      const encryptedMerged: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(merged)) {
        if (v) encryptedMerged[k] = encrypt(v)
      }
      updates['settings.aiKeys'] = encryptedMerged
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid settings provided' })
    }

    const before = (await User.findById(userId).select('settings').lean())?.settings
    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).select('settings').lean()
    audit(userId, 'update', 'settings', userId, { before, after: null })
    return res.json(user?.settings || DEFAULT_SETTINGS)
  } catch (e) {
    console.error('PUT /api/settings error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
