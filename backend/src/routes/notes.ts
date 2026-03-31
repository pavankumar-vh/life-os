import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Note } from '../models/Note'
import { DEMO_NOTES } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEMO_NOTES)
    const notes = await Note.find({ userId }).sort({ updatedAt: -1 })
    return res.json(notes)
  } catch (e) {
    console.error('GET /api/notes error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const bodyId = req.body._id
    const data = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      return res.json({
        _id: bodyId || `demo-${Date.now()}`,
        ...data,
        userId,
        createdAt: (data as any).createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
    let note
    if (bodyId) {
      note = await Note.findOneAndUpdate(
        { _id: bodyId, userId },
        { ...data, userId },
        { new: true }
      )
    }
    if (!note) {
      note = await Note.create({ ...data, userId })
    }
    return res.json(note)
  } catch (e) {
    console.error('POST /api/notes error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    await Note.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/notes error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
