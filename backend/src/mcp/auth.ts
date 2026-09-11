/**
 * MCP Authentication Helper
 * ─────────────────────────
 * Validates a Life OS JWT token and returns the authenticated userId.
 *
 * Design notes:
 * - Reuses the SAME verifyToken() from the backend's existing auth lib.
 * - MFA challenge tokens are rejected (they cannot access protected routes).
 * - The token is supplied as a tool argument by the MCP client.
 * - userId is ALWAYS derived from the verified token — never from tool args.
 */

import { verifyToken } from '../lib/auth'
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'
import { McpToken } from '../models/McpToken'
import bcrypt from 'bcryptjs'

export interface McpIdentity {
  userId: string
  email?: string
  scopes?: string[]
}

/**
 * Verifies an MCP bearer token.
 * Throws McpError on invalid/expired/challenge tokens.
 */
export async function verifyMcpToken(token: unknown): Promise<McpIdentity> {
  if (!token || typeof token !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, 'token is required')
  }

  // 1. Check if it's a dedicated MCP Access Token (e.g. mcp_abc123)
  if (token.startsWith('mcp_')) {
    // Because we only have the plaintext token, we must find all active tokens
    // and verify the hash. To avoid checking every token in the DB, we could just
    // do a linear scan of non-revoked tokens. But since this is called often,
    // let's grab all active tokens.
    // Wait, the MCP token is a secret. A better design is `mcp_<tokenId>_<secret>` 
    // but the current implementation generates `mcp_<32bytes>`. 
    // Let's just fetch all non-revoked tokens and check the hash.
    // In a massive system, this would be slow, but for self-hosting it's totally fine.
    const activeTokens = await McpToken.find({ isRevoked: false }).select('+tokenHash')
    for (const dbToken of activeTokens) {
      const match = await bcrypt.compare(token, dbToken.tokenHash)
      if (match) {
        dbToken.lastUsedAt = new Date()
        await dbToken.save()
        return {
          userId: dbToken.userId.toString(),
          scopes: dbToken.scopes
        }
      }
    }
    throw new McpError(ErrorCode.InvalidParams, 'Invalid or revoked MCP token')
  }

  // 2. Fall back to standard Life OS JWT
  const payload = verifyToken(token)
  if (!payload) {
    throw new McpError(ErrorCode.InvalidParams, 'Invalid or expired token')
  }

  // Reject MFA challenge tokens
  if ((payload as unknown as Record<string, unknown>).mfaChallenge) {
    throw new McpError(ErrorCode.InvalidParams, 'MFA challenge tokens cannot be used for MCP access')
  }

  return {
    userId: payload.userId,
    email: payload.email,
    scopes: ['read', 'write'] // Web JWT has full access
  }
}
