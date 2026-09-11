import { Router, Response } from 'express'
import { authMiddleware, AuthRequest, isDemoUser } from '../lib/auth'
import { McpToken } from '../models/McpToken'
import { audit } from '../lib/audit'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const router = Router()
router.use(authMiddleware)

// GET /api/mcp-tokens
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (isDemoUser(req.user!.userId)) return res.json([])

    const tokens = await McpToken.find({ userId: req.user!.userId })
      .select('-tokenHash')
      .sort({ createdAt: -1 })
      .lean()
    
    return res.json(tokens)
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch MCP tokens' })
  }
})

// POST /api/mcp-tokens — Generate a new token
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    if (isDemoUser(req.user!.userId)) {
      return res.status(403).json({ error: 'Demo user cannot generate MCP tokens' })
    }

    const { name, scopes = ['read', 'write'] } = req.body
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Token name is required' })
    }

    // Generate secure random token
    // Prefix with "mcp_" so the MCP server can quickly distinguish it from standard JWTs
    const rawSecret = crypto.randomBytes(32).toString('hex')
    const tokenString = `mcp_${rawSecret}`

    // Hash it for storage
    const tokenHash = await bcrypt.hash(tokenString, 12)

    const mcpToken = await McpToken.create({
      name: name.trim(),
      userId: req.user!.userId,
      tokenHash,
      scopes,
      isRevoked: false
    })

    audit(req.user!.userId, 'create', 'mcp_token', mcpToken._id, {
      after: { name: mcpToken.name, scopes }
    })

    // Return the raw token EXACTLY ONCE
    return res.status(201).json({
      _id: mcpToken._id,
      name: mcpToken.name,
      scopes: mcpToken.scopes,
      createdAt: mcpToken.createdAt,
      token: tokenString // WARNING: Never shown again!
    })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create MCP token' })
  }
})

// DELETE /api/mcp-tokens/:id — Revoke a token
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (isDemoUser(req.user!.userId)) {
      return res.status(403).json({ error: 'Demo user cannot revoke MCP tokens' })
    }

    // We do a hard delete, or we could just mark it revoked
    // Marking revoked is safer for audit trails
    const token = await McpToken.findOneAndUpdate(
      { _id: req.params.id, userId: req.user!.userId },
      { isRevoked: true },
      { new: true }
    )

    if (!token) return res.status(404).json({ error: 'Token not found' })

    audit(req.user!.userId, 'delete', 'mcp_token', token._id, {
      before: { name: token.name }
    })

    return res.json({ success: true, revoked: token._id })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to revoke MCP token' })
  }
})

export default router
