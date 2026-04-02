import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Gratitude } from '../models/Gratitude'
import { DEMO_GRATITUDE } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEMO_GRATITUDE)
    const items = await Gratitude.find({ userId }).sort({ date: -1 })
    return res.json(items)
  } catch (e) {
    console.error('GET /api/gratitude error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const bodyId = req.body._id
    const body = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      return res.json({ _id: bodyId || `demo-${Date.now()}`, ...body, userId })
    }
    if (bodyId) {
      const item = await Gratitude.findOneAndUpdate({ _id: bodyId, userId }, body, { new: true })
      if (!item) return res.status(404).json({ error: 'Not found' })
      return res.json(item)
    }
    const item = await Gratitude.create({ ...body, userId })
    return res.status(201).json(item)
  } catch (e) {
    console.error('POST /api/gratitude error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    await Gratitude.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/gratitude error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
