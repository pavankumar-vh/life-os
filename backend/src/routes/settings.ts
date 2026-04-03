import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { User } from '../models/User'

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
    // Mask AI keys — only return last 4 chars for display
    const maskedKeys: Record<string, string> = {}
    if (settings.aiKeys) {
      for (const [k, v] of Object.entries(settings.aiKeys as Record<string, string>)) {
        maskedKeys[k] = v ? `...${v.slice(-4)}` : ''
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

    // Only allow updating known settings fields
    const allowed = ['accentColor', 'goals', 'aiProvider', 'aiModels', 'aiKeys', 'lastBackup']
    const updates: Record<string, unknown> = {}
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[`settings.${key}`] = req.body[key]
      }
    }

    // For aiKeys: only update keys that are real values (not masked "...xxxx")
    // Merge with existing to avoid overwriting unrelated providers
    if (updates['settings.aiKeys']) {
      const incoming = updates['settings.aiKeys'] as Record<string, string>
      const existing = (await User.findById(userId).select('settings.aiKeys').lean())?.settings?.aiKeys || {}
      const merged: Record<string, string> = { ...existing }
      for (const [provider, value] of Object.entries(incoming)) {
        if (value && !value.startsWith('...')) {
          merged[provider] = value
        } else if (value === '') {
          // Allow clearing a key by sending empty string
          delete merged[provider]
        }
        // Skip masked values — keep existing
      }
      updates['settings.aiKeys'] = merged
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid settings provided' })
    }

    const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).select('settings').lean()
    return res.json(user?.settings || DEFAULT_SETTINGS)
  } catch (e) {
    console.error('PUT /api/settings error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
