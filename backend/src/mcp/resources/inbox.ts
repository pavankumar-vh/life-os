/**
 * MCP Resources — Inbox
 *
 * Resource URI: life://inbox
 * Provides a read-only snapshot of unprocessed Life OS captures.
 */

import mongoose from 'mongoose'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { Capture } from '../../models/Capture'

/**
 * Registers the life://inbox resource.
 * Returns up to 50 unprocessed captures (newest first).
 */
export function registerInboxResource(server: McpServer, userId: string): void {
  const userObjId = new mongoose.Types.ObjectId(userId)

  server.registerResource(
    'inbox',
    'life://inbox',
    {
      title: 'Life OS — Inbox',
      description: 'Unprocessed captures in the Life OS inbox. These are thoughts, ideas, to-dos and reminders awaiting review.',
      mimeType: 'application/json',
    },
    async (_uri) => {
      const items = await Capture.find({ userId: userObjId, processed: false })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()

      const total = await Capture.countDocuments({ userId: userObjId, processed: false })

      const result = {
        total,
        showing: items.length,
        items: items.map(c => ({
          id: String(c._id),
          text: c.text,
          type: c.type,
          source: c.source,
          tags: c.tags ?? [],
          createdAt: c.createdAt,
        })),
      }

      return {
        contents: [{
          uri: 'life://inbox',
          mimeType: 'application/json',
          text: JSON.stringify(result, null, 2),
        }],
      }
    }
  )
}
