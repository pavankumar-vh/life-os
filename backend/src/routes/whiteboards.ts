import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Whiteboard } from '../models/Whiteboard'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json([])
    const boards = await Whiteboard.find({ userId }).sort({ updatedAt: -1 })
    return res.json(boards)
  } catch (e) {
    console.error('GET /api/whiteboards error:', e)
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
    let board
    if (bodyId) {
      board = await Whiteboard.findOneAndUpdate(
        { _id: bodyId, userId },
        { ...data, userId },
        { new: true }
      )
    }
    if (!board) {
      board = await Whiteboard.create({ ...data, userId })
    }
    return res.json(board)
  } catch (e) {
    console.error('POST /api/whiteboards error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    await Whiteboard.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/whiteboards error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
