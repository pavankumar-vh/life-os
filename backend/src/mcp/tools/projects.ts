/**
 * MCP Tools — Projects
 *
 * Tools:
 *   get_projects — list all projects for the authenticated user
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { verifyMcpToken } from '../auth'
import { toMcpError } from '../errors'
import { ProjectService } from '../../services/ProjectService'

export function registerProjectTools(server: McpServer): void {

  server.registerTool('get_projects', {
    title: 'Get Projects',
    description: 'Returns all projects for the authenticated Life OS user, including status, progress, and deadlines.',
    inputSchema: {
      token: z.string().describe('Life OS JWT token'),
      status: z.enum(['active', 'completed', 'paused', 'archived']).optional()
        .describe('Filter by project status. Omit for all projects.'),
    },
  }, async ({ token, status }) => {
    try {
      const { userId } = verifyMcpToken(token)
      const projects = await ProjectService.getProjects(userId)

      const filtered = status
        ? (projects as Array<Record<string, unknown>>).filter(p => p.status === status)
        : projects

      const result = (filtered as Array<Record<string, unknown>>).map(p => ({
        id: String(p._id),
        name: p.name,
        description: p.description ?? null,
        status: p.status,
        progress: p.progress ?? 0,
        deadline: p.deadline ?? null,
        updatedAt: p.updatedAt,
      }))

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    } catch (err) {
      throw toMcpError(err)
    }
  })
}
