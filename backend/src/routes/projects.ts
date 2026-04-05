import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Project } from '../models/Project'
import { audit } from '../lib/audit'
import { DEMO_PROJECTS } from '../lib/demo-data'

const router = Router()
router.use(authMiddleware)

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    if (isDemoUser(userId)) return res.json(DEMO_PROJECTS)
    const items = await Project.find({ userId }).sort({ updatedAt: -1 })
    return res.json(items)
  } catch (e) {
    console.error('GET /api/projects error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const body = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      return res.json({ _id: `demo-${Date.now()}`, ...body, userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    }
    const item = await Project.create({ ...body, userId })
    audit(userId, 'create', 'projects', item._id, { after: item.toJSON() })
    return res.status(201).json(item)
  } catch (e) {
    console.error('POST /api/projects error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    const updates = sanitizeBody(req.body)
    if (isDemoUser(userId)) {
      const existing = DEMO_PROJECTS.find(p => p._id === id)
      return res.json({ ...(existing || {}), ...updates, _id: id, userId })
    }
    const item = await Project.findOneAndUpdate({ _id: id, userId }, updates, { new: true })
    if (!item) return res.status(404).json({ error: 'Not found' })
    audit(userId, 'update', 'projects', id, { after: item.toJSON(), changes: updates as Record<string, unknown> })
    return res.json(item)
  } catch (e) {
    console.error('PUT /api/projects error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const { id } = req.params
    if (isDemoUser(userId)) return res.json({ success: true })
    const item = await Project.findOne({ _id: id, userId })
    if (item) audit(userId, 'delete', 'projects', id, { before: item.toJSON() })
    await Project.findOneAndDelete({ _id: id, userId })
    return res.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/projects error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
