import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Capture } from '../models/Capture'
import { DEMO_CAPTURES } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEMO_CAPTURES)
    const items = await Capture.find({ userId }).sort({ createdAt: -1 })
    return res.json(items)
  } catch (e) {
    console.error('GET /api/captures error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const body = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      return res.json({ _id: `demo-${Date.now()}`, ...body, userId, processed: false, createdAt: new Date().toISOString() })
    }
    const item = await Capture.create({ ...body, userId })
    return res.status(201).json(item)
  } catch (e) {
    console.error('POST /api/captures error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const updates = sanitizeBody(req.body)
    if (isDemoUser(userId)) return res.json({ _id: id, ...updates, userId })
    const item = await Capture.findOneAndUpdate({ _id: id, userId }, updates, { new: true })
    if (!item) return res.status(404).json({ error: 'Not found' })
    return res.json(item)
  } catch (e) {
    console.error('PUT /api/captures error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    await Capture.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/captures error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
