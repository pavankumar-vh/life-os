import { Router, Response } from 'express'
import multer from 'multer'
import { authMiddleware, AuthRequest, isDemoUser } from '../lib/auth'
import { uploadToB2, deleteFromB2 } from '../lib/b2'
import { VaultFile, detectFileType } from '../models/VaultFile'

const router = Router()
router.use(authMiddleware)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
})

// GET /api/vault — list files, optional ?folder=Documents
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (isDemoUser(req.user!.userId)) return res.json([])
    const { folder, starred, search } = req.query
    const query: Record<string, unknown> = { userId: req.user!.userId }
    if (folder) query.folder = folder
    if (starred === 'true') query.starred = true
    if (search) query.name = { $regex: search, $options: 'i' }
    const files = await VaultFile.find(query).sort({ starred: -1, createdAt: -1 }).lean()
    return res.json(files)
  } catch (e) {
    console.error('GET /api/vault error:', e)
    return res.status(500).json({ error: 'Failed to list vault files' })
  }
})

// GET /api/vault/folders — list unique folder paths for this user
router.get('/folders', async (req: AuthRequest, res: Response) => {
  try {
    if (isDemoUser(req.user!.userId)) return res.json(['Root'])
    const folders = await VaultFile.distinct('folder', { userId: req.user!.userId })
    return res.json(['Root', ...folders.filter(f => f !== 'Root').sort()])
  } catch (e) {
    return res.status(500).json({ error: 'Failed to list folders' })
  }
})

// POST /api/vault/upload — upload file(s) to B2
router.post('/upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!process.env.B2_BUCKET_NAME) {
      return res.status(400).json({ error: 'Backblaze B2 not configured' })
    }
    if (isDemoUser(req.user!.userId)) {
      return res.status(400).json({ error: 'Demo user cannot upload to vault' })
    }
    if (!req.file) return res.status(400).json({ error: 'No file provided' })

    const folder = (req.body.folder as string) || 'Root'
    const displayName = (req.body.name as string) || req.file.originalname
    const b2Folder = `vault/${req.user!.userId}/${folder}`

    const { url, key } = await uploadToB2(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      b2Folder
    )

    const vaultFile = await VaultFile.create({
      userId: req.user!.userId,
      name: displayName,
      originalName: req.file.originalname,
      url,
      key,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      fileType: detectFileType(req.file.mimetype),
      folder,
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      starred: false,
    })

    return res.status(201).json(vaultFile)
  } catch (e) {
    console.error('POST /api/vault/upload error:', e)
    return res.status(500).json({ error: 'Failed to upload file' })
  }
})

// PATCH /api/vault/:id — rename, move folder, toggle star, update tags
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, folder, starred, tags } = req.body
    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (folder !== undefined) updates.folder = folder
    if (starred !== undefined) updates.starred = starred
    if (tags !== undefined) updates.tags = tags

    const file = await VaultFile.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.userId },
      { $set: updates },
      { new: true }
    )
    if (!file) return res.status(404).json({ error: 'File not found' })
    return res.json(file)
  } catch (e) {
    return res.status(500).json({ error: 'Failed to update file' })
  }
})

// DELETE /api/vault/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (isDemoUser(req.user!.userId)) {
      return res.status(400).json({ error: 'Demo user cannot delete vault files' })
    }
    const file = await VaultFile.findOne({ _id: req.params.id, userId: req.user!.userId })
    if (!file) return res.status(404).json({ error: 'File not found' })

    await deleteFromB2(file.key)
    await VaultFile.deleteOne({ _id: file._id })
    return res.json({ deleted: true })
  } catch (e) {
    console.error('DELETE /api/vault/:id error:', e)
    return res.status(500).json({ error: 'Failed to delete file' })
  }
})

// DELETE /api/vault/folder/:name — delete all files in a folder
router.delete('/folder/:name', async (req: AuthRequest, res: Response) => {
  try {
    if (isDemoUser(req.user!.userId)) {
      return res.status(400).json({ error: 'Demo user cannot delete folders' })
    }
    const files = await VaultFile.find({ userId: req.user!.userId, folder: req.params.name })
    await Promise.all(files.map(f => deleteFromB2(f.key)))
    await VaultFile.deleteMany({ userId: req.user!.userId, folder: req.params.name })
    return res.json({ deleted: files.length })
  } catch (e) {
    return res.status(500).json({ error: 'Failed to delete folder' })
  }
})

export default router
