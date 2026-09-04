/**
 * MCP Error Mapping
 * ─────────────────
 * Maps Life OS AppError subclasses to appropriate MCP errors.
 * Ensures stack traces and internals are never leaked.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'
import { AppError, NotFoundError, ValidationError, UnauthorizedError, ForbiddenError } from '../lib/errors'

/**
 * Converts any error to a safe McpError.
 * Never exposes stack traces, file paths, or DB internals.
 */
export function toMcpError(err: unknown): McpError {
  if (err instanceof McpError) return err

  if (err instanceof UnauthorizedError) {
    return new McpError(ErrorCode.InvalidParams, 'Authentication failed')
  }
  if (err instanceof ForbiddenError) {
    return new McpError(ErrorCode.InvalidParams, 'Access denied')
  }
  if (err instanceof NotFoundError) {
    return new McpError(ErrorCode.InvalidParams, err.message)
  }
  if (err instanceof ValidationError) {
    return new McpError(ErrorCode.InvalidParams, err.message)
  }
  if (err instanceof AppError) {
    return new McpError(ErrorCode.InternalError, err.message)
  }

  // Unknown error — generic message, no internals
  return new McpError(ErrorCode.InternalError, 'An unexpected error occurred')
}
