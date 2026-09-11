import { Router, Response, NextFunction } from 'express'
import { authMiddleware, AuthRequest } from '../lib/auth'
import { User } from '../models/User'
import { VaultFile } from '../models/VaultFile'
import { AuditLog } from '../models/AuditLog'
import { audit } from '../lib/audit'
import { deleteFromB2 } from '../lib/b2'

const router = Router()

router.use(authMiddleware)

// Admin Authorization Middleware
const isAdminMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user!.userId)
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Host Admin access required' })
    }
    next()
  } catch (error) {
    res.status(500).json({ error: 'Server error authorizing admin' })
  }
}

router.use(isAdminMiddleware)

// GET /api/admin/overview
router.get('/overview', async (req: AuthRequest, res: Response) => {
  try {
    const [totalUsers, pendingUsers, disabledUsers, vaultStats] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isApproved: false }),
      User.countDocuments({ isDisabled: true }),
      VaultFile.aggregate([{ $group: { _id: null, totalSize: { $sum: '$sizeBytes' } } }])
    ])

    return res.json({
      health: 'ok',
      totalUsers,
      pendingUsers,
      disabledUsers,
      totalStorageBytes: vaultStats[0]?.totalSize || 0,
      limits: {
        registrationEnabled: process.env.REGISTRATION_ENABLED !== 'false',
        requireApproval: process.env.REQUIRE_ACCOUNT_APPROVAL === 'true',
        maxUsers: process.env.MAX_USERS || 'unlimited',
        maxVaultBytesPerUser: process.env.MAX_VAULT_BYTES_PER_USER || 'unlimited'
      }
    })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch overview' })
  }
})

// GET /api/admin/users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find()
      .select('_id name email isApproved isDisabled isAdmin createdAt xp level')
      .sort({ createdAt: -1 })
      .lean()
    
    return res.json(users)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// PATCH /api/admin/users/:id/approve
router.patch('/users/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true }).select('-password')
    if (!user) return res.status(404).json({ error: 'User not found' })
    audit(req.user!.userId, 'update', 'user_approval', user._id, { after: { isApproved: true } })
    return res.json({ success: true, user })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to approve user' })
  }
})

// PATCH /api/admin/users/:id/disable
router.patch('/users/:id/disable', async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id === req.user!.userId) {
      return res.status(400).json({ error: 'You cannot disable yourself' })
    }
    const user = await User.findByIdAndUpdate(req.params.id, { isDisabled: true }, { new: true }).select('-password')
    if (!user) return res.status(404).json({ error: 'User not found' })
    audit(req.user!.userId, 'update', 'user_disable', user._id, { after: { isDisabled: true } })
    return res.json({ success: true, user })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to disable user' })
  }
})

// PATCH /api/admin/users/:id/enable
router.patch('/users/:id/enable', async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isDisabled: false }, { new: true }).select('-password')
    if (!user) return res.status(404).json({ error: 'User not found' })
    audit(req.user!.userId, 'update', 'user_enable', user._id, { after: { isDisabled: false } })
    return res.json({ success: true, user })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to enable user' })
  }
})

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id === req.user!.userId) {
      return res.status(400).json({ error: 'You cannot delete yourself' })
    }
    
    const targetUser = await User.findById(req.params.id)
    if (!targetUser) return res.status(404).json({ error: 'User not found' })
    
    if (targetUser.isAdmin) {
      // Prevent deleting the last admin
      const adminCount = await User.countDocuments({ isAdmin: true })
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last administrator' })
      }
    }

    // Delete vault files from B2
    const files = await VaultFile.find({ userId: targetUser._id })
    for (const f of files) {
      await deleteFromB2(f.key).catch(err => console.error(`Failed to delete B2 file ${f.key}:`, err))
    }

    // Note: To be fully clean we should delete Tasks, Goals, etc. but deleting the user record blocks their access.
    // For now we will delete their User and VaultFile records.
    await VaultFile.deleteMany({ userId: targetUser._id })
    await User.deleteOne({ _id: targetUser._id })
    
    audit(req.user!.userId, 'delete', 'user', targetUser._id, { before: { email: targetUser.email } })
    return res.json({ success: true, deleted: targetUser._id })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete user' })
  }
})

// GET /api/admin/audit
router.get('/audit', async (req: AuthRequest, res: Response) => {
  try {
    // Only return events relevant to security/admin to avoid exposing private data
    const logs = await AuditLog.find({
      $or: [
        { collectionName: 'user' },
        { collectionName: 'user_approval' },
        { collectionName: 'user_disable' },
        { collectionName: 'user_enable' },
        { collectionName: 'mcp_token' }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean()

    return res.json(logs)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch audit logs' })
  }
})

export default router
