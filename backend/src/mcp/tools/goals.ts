/**
 * MCP Tools — Goals
 *
 * Tools:
 *   get_goals — list all goals for the authenticated user
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { verifyMcpToken } from '../auth'
import { toMcpError } from '../errors'
import { GoalService } from '../../services/GoalService'

export function registerGoalTools(server: McpServer): void {

  server.registerTool('get_goals', {
    title: 'Get Goals',
    description: 'Returns all goals for the authenticated Life OS user, including status, progress, target, and deadlines.',
    inputSchema: {
      token: z.string().describe('Life OS JWT token'),
      status: z.enum(['active', 'completed', 'paused']).optional()
        .describe('Filter by status. Omit to return all goals.'),
    },
  }, async ({ token, status }) => {
    try {
      const { userId } = verifyMcpToken(token)
      const goals = await GoalService.getGoals(userId)

      const filtered = status
        ? (goals as Array<Record<string, unknown>>).filter(g => g.status === status)
        : goals

      const result = (filtered as Array<Record<string, unknown>>).map(g => ({
        id: String(g._id),
        title: g.title,
        category: g.category ?? null,
        status: g.status,
        progress: g.progress ?? 0,
        target: g.target ?? null,
        unit: g.unit ?? null,
        deadline: g.deadline ?? null,
        createdAt: g.createdAt,
      }))

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    } catch (err) {
      throw toMcpError(err)
    }
  })
}
