/**
 * MCP Tools — Captures (Inbox)
 *
 * Tools:
 *   quick_capture — create a new capture (thought, idea, todo, reminder)
 *   get_captures  — list captures with optional filters
 *
 * MCP-originated captures use source: 'mcp'.
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { verifyMcpToken } from '../auth'
import { toMcpError } from '../errors'
import { CaptureService } from '../../services/CaptureService'

export function registerCaptureTools(server: McpServer): void {

  // ── quick_capture ─────────────────────────────────────────────────────────

  server.registerTool('quick_capture', {
    title: 'Quick Capture',
    description: 'Saves a thought, idea, to-do, or reminder to the Life OS inbox for later processing. This is the primary entry point for any information an agent wants to pass to the user.',
    inputSchema: {
      token: z.string().describe('Life OS JWT token'),
      text: z.string().min(1).max(10000).describe('The content to capture (required)'),
      type: z.enum(['thought', 'idea', 'todo', 'reminder']).optional()
        .describe('Type of capture. Defaults to "thought".'),
      tags: z.array(z.string().max(50)).max(10).optional()
        .describe('Optional tags (max 10, each max 50 chars)'),
    },
  }, async ({ token, text, type, tags }) => {
    try {
      const { userId } = verifyMcpToken(token)

      const item = await CaptureService.createCapture(userId, {
        text,
        type: type ?? 'thought',
        source: 'mcp',  // MCP-originated — tracked in audit log and capture
        tags: tags ?? [],
      } as never)

      const c = item as unknown as Record<string, unknown>
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: String(c._id),
            text: c.text,
            type: c.type,
            source: c.source,
            tags: c.tags,
            processed: c.processed,
            createdAt: c.createdAt,
            message: 'Capture saved to inbox',
          }, null, 2),
        }],
      }
    } catch (err) {
      throw toMcpError(err)
    }
  })

  // ── get_captures ──────────────────────────────────────────────────────────

  server.registerTool('get_captures', {
    title: 'Get Captures',
    description: 'Returns captures from the Life OS inbox with optional filters. Defaults to unprocessed items.',
    inputSchema: {
      token: z.string().describe('Life OS JWT token'),
      processed: z.boolean().optional()
        .describe('Filter by processed status. true=processed, false=inbox items. Omit for all.'),
      type: z.enum(['thought', 'idea', 'todo', 'reminder']).optional()
        .describe('Filter by capture type'),
      limit: z.number().int().min(1).max(100).optional()
        .describe('Maximum number of results (default 50, max 100)'),
    },
  }, async ({ token, processed, type, limit }) => {
    try {
      const { userId } = verifyMcpToken(token)

      const items = await CaptureService.getCaptures(userId, {
        processed: processed === undefined ? undefined : String(processed),
        type,
        limit: limit ?? 50,
      })

      const result = (items as Array<Record<string, unknown>>).map(c => ({
        id: String(c._id),
        text: c.text,
        type: c.type,
        source: c.source,
        tags: c.tags ?? [],
        processed: c.processed,
        createdAt: c.createdAt,
      }))

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    } catch (err) {
      throw toMcpError(err)
    }
  })
}
