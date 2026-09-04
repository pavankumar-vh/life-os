import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { Note } from '../models/Note'
import { audit } from '../lib/audit'
import { DEMO_NOTES } from '../lib/demo-data'
import { asyncHandler } from '../middleware/asyncHandler'
import { isValidObjectId } from '../lib/utils'
import { ValidationError, NotFoundError } from '../lib/errors'

const router = Router()
router.use(authMiddleware)

router.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  if (isDemoUser(userId)) return res.json(DEMO_NOTES)
  const notes = await Note.find({ userId }).sort({ updatedAt: -1 }).limit(200)
  return res.json(notes)
}))

router.post('/', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const bodyId = req.body._id as string | undefined
  const data = sanitizeBody(req.body)

  if (isDemoUser(userId)) {
    return res.json({
      _id: bodyId || `demo-${Date.now()}`,
      ...data,
      userId,
      createdAt: (data as Record<string, unknown>).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  let note
  if (bodyId) {
    if (!isValidObjectId(bodyId)) throw new ValidationError('Invalid note ID')
    note = await Note.findOneAndUpdate(
      { _id: bodyId, userId },
      { ...data, userId },
      { new: true }
    )
    if (!note) throw new NotFoundError('Note not found')
    audit(userId, 'update', 'notes', bodyId, {
      after: note.toJSON(),
      eventType: 'note.updated',
      source: 'manual',
      metadata: { title: note.title, folder: note.folder },
    })
  } else {
    note = await Note.create({ ...data, userId })
    audit(userId, 'create', 'notes', note._id, {
      after: note.toJSON(),
      eventType: 'note.created',
      source: 'manual',
      metadata: { title: note.title, folder: note.folder },
    })
  }
  return res.json(note)
}))

router.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId
  const id = String(req.params.id)
  if (!isValidObjectId(id)) throw new ValidationError('Invalid note ID')
  if (isDemoUser(userId)) return res.json({ success: true })
  const note = await Note.findOne({ _id: id, userId })
  if (note) {
    audit(userId, 'delete', 'notes', id, {
      before: note.toJSON(),
      eventType: 'note.deleted',
      source: 'manual',
      metadata: { title: note.title },
    })
  }
  await Note.findOneAndDelete({ _id: id, userId })
  return res.json({ success: true })
}))

export default router
