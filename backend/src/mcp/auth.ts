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

export interface McpIdentity {
  userId: string
  email: string
}

/**
 * Verifies an MCP bearer token.
 * Throws McpError on invalid/expired/challenge tokens.
 */
export function verifyMcpToken(token: unknown): McpIdentity {
  if (!token || typeof token !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, 'token is required')
  }

  const payload = verifyToken(token)
  if (!payload) {
    throw new McpError(ErrorCode.InvalidParams, 'Invalid or expired token')
  }

  // Reject MFA challenge tokens — they cannot access data
  if ((payload as unknown as Record<string, unknown>).mfaChallenge) {
    throw new McpError(ErrorCode.InvalidParams, 'MFA challenge tokens cannot be used for MCP access')
  }

  return {
    userId: payload.userId,
    email: payload.email,
  }
}
