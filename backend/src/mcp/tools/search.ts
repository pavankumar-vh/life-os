/**
 * MCP Tools — Search
 *
 * Tools:
 *   search_life — keyword search across all Life OS collections
 *
 * Delegates to the existing SearchService.
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { verifyMcpToken } from '../auth'
import { toMcpError } from '../errors'
import { SearchService, SearchResultType } from '../../lib/SearchService'

const ALL_TYPES: SearchResultType[] = [
  'task', 'goal', 'note', 'journal', 'habit',
  'capture', 'bookmark', 'book', 'project',
]

export function registerSearchTool(server: McpServer): void {

  server.registerTool('search_life', {
    title: 'Search Life OS',
    description: 'Keyword search across Life OS — tasks, goals, notes, journal, habits, captures, bookmarks, books, and projects. Returns relevant results ranked by match quality.',
    inputSchema: {
      token: z.string().describe('Life OS JWT token'),
      query: z.string().min(1).max(200).describe('Search query (required, max 200 chars)'),
      types: z.array(z.enum([
        'task', 'goal', 'note', 'journal', 'habit',
        'capture', 'bookmark', 'book', 'project',
      ])).optional().describe('Limit to specific entity types. Omit to search all.'),
      limit: z.number().int().min(1).max(50).optional()
        .describe('Maximum number of results (default 20, max 50)'),
    } as any,
  }, async ({ token, query, types, limit }: { token: string; query: string; types?: string[]; limit?: number }) => {
    try {
      const { userId } = verifyMcpToken(token)

      const response = await SearchService.search({
        q: query,
        types: types as SearchResultType[] | undefined ?? ALL_TYPES,
        limit: limit ?? 20,
        skip: 0,
        userId,
      })

      const result = response.results.map(r => ({
        id: r.id,
        type: r.type,
        title: r.title,
        subtitle: r.subtitle,
        snippet: r.snippet ?? null,
        view: r.view,
        score: r.score,
      }))

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            query: response.query,
            total: response.total,
            durationMs: response.durationMs,
            results: result,
          }, null, 2),
        }],
      }
    } catch (err) {
      throw toMcpError(err)
    }
  })
}
