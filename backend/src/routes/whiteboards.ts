import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Whiteboard, WhiteboardFolder } from '../models/Whiteboard'

const router = Router()
router.use(authMiddleware)

// ─── FOLDERS ────────────────────────────────────────

router.get('/folders', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json([])
    const folders = await WhiteboardFolder.find({ userId }).sort({ name: 1 })
    return res.json(folders)
  } catch (e) {
    console.error('GET /api/whiteboards/folders error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/folders', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const data = sanitizeBody(req.body)
    const bodyId = req.body._id
    if (isDemoUser(userId)) {
      return res.json({ _id: bodyId || `demo-${Date.now()}`, ...data, userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    }
    let folder
    if (bodyId) {
      folder = await WhiteboardFolder.findOneAndUpdate({ _id: bodyId, userId }, { ...data, userId }, { new: true })
      if (!folder) return res.status(404).json({ error: 'Folder not found' })
    } else {
      folder = await WhiteboardFolder.create({ ...data, userId })
    }
    return res.json(folder)
  } catch (e) {
    console.error('POST /api/whiteboards/folders error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/folders/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    const folderId = Array.isArray(id) ? id[0] : id
    // Move boards in this folder to root
    await Whiteboard.updateMany({ folderId, userId }, { $set: { folderId: null } })
    // Delete sub-folders recursively
    const deleteRecursive = async (fid: string) => {
      const children = await WhiteboardFolder.find({ parentId: fid, userId })
      for (const child of children) {
        await Whiteboard.updateMany({ folderId: child._id, userId }, { $set: { folderId: null } })
        await deleteRecursive(String(child._id))
      }
      await WhiteboardFolder.findOneAndDelete({ _id: fid, userId })
    }
    await deleteRecursive(folderId)
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/whiteboards/folders error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

// ─── BOARDS ─────────────────────────────────────────

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
      if (!board) return res.status(404).json({ error: 'Board not found' })
    } else {
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
