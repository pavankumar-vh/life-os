import { Router, Response } from 'express'
import multer from 'multer'
import { authMiddleware, AuthRequest, isDemoUser } from '../lib/auth'
import { uploadToB2, deleteFromB2 } from '../lib/b2'
import { Photo } from '../models/Photo'

const router = Router()
router.use(authMiddleware)

// Multer: memory storage, 10MB limit, images only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'))
    } else {
      cb(null, true)
    }
  },
})

// POST /api/uploads/photo
// Body: multipart/form-data with field "photo", optional "context" and "refId"
router.post('/photo', upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!process.env.B2_BUCKET_NAME) {
      return res.status(400).json({ error: 'Backblaze B2 not configured. Set B2_BUCKET_NAME and related env vars.' })
    }

    if (isDemoUser(req.user!.userId)) {
      return res.status(400).json({ error: 'Demo user cannot upload photos' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No photo file provided' })
    }

    const { context = 'general', refId } = req.body
    const folder = `${req.user!.userId}/${context}`

    const { url, key } = await uploadToB2(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      folder
    )

    const photo = await Photo.create({
      userId: req.user!.userId,
      url,
      key,
      context,
      refId: refId || undefined,
      filename: req.file.originalname,
      sizeBytes: req.file.size,
      mimeType: req.file.mimetype,
    })

    return res.status(201).json({
      id: photo._id,
      url,
      key,
      filename: req.file.originalname,
      sizeBytes: req.file.size,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Upload error:', error)
    if (msg.includes('Only image')) return res.status(400).json({ error: msg })
    return res.status(500).json({ error: 'Failed to upload photo' })
  }
})

// GET /api/uploads/photos?context=note&refId=xxx
router.get('/photos', async (req: AuthRequest, res: Response) => {
  try {
    if (isDemoUser(req.user!.userId)) return res.json([])
    const { context, refId } = req.query
    const query: Record<string, unknown> = { userId: req.user!.userId }
    if (context) query.context = context
    if (refId) query.refId = refId
    const photos = await Photo.find(query).sort({ createdAt: -1 }).lean()
    return res.json(photos.map(p => ({
      id: p._id,
      url: p.url,
      key: p.key,
      filename: p.filename,
      sizeBytes: p.sizeBytes,
      context: p.context,
      refId: p.refId,
      createdAt: p.createdAt,
    })))
  } catch (error) {
    console.error('List photos error:', error)
    return res.status(500).json({ error: 'Failed to list photos' })
  }
})

// DELETE /api/uploads/photo/:id
router.delete('/photo/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (isDemoUser(req.user!.userId)) {
      return res.status(400).json({ error: 'Demo user cannot delete photos' })
    }

    const photo = await Photo.findOne({ _id: req.params.id, userId: req.user!.userId })
    if (!photo) return res.status(404).json({ error: 'Photo not found' })

    // Delete from B2 first, then remove record
    await deleteFromB2(photo.key)
    await Photo.deleteOne({ _id: photo._id })

    return res.json({ deleted: true })
  } catch (error) {
    console.error('Delete photo error:', error)
    return res.status(500).json({ error: 'Failed to delete photo' })
  }
})

export default router
