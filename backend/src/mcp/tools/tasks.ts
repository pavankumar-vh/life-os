/**
 * MCP Tools — Tasks
 *
 * Tools:
 *   get_tasks    — list all tasks for the authenticated user
 *   create_task  — create a new task
 *   complete_task — mark a task as done
 *
 * All tools require a `token` argument (Life OS JWT).
 * userId is ALWAYS derived from the verified token.
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { verifyMcpToken } from '../auth'
import { toMcpError } from '../errors'
import { TaskService } from '../../services/TaskService'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function registerTaskTools(server: McpServer): void {

  // ── get_tasks ─────────────────────────────────────────────────────────────

  server.registerTool('get_tasks', {
    title: 'Get Tasks',
    description: 'Returns all tasks for the authenticated Life OS user, sorted newest first. Includes status, priority, due date, and tags.',
    inputSchema: {
      token: z.string().describe('Life OS JWT token'),
      status: z.enum(['todo', 'in_progress', 'done']).optional()
        .describe('Filter by status (optional). Omit to return all tasks.'),
    },
  }, async ({ token, status }) => {
    try {
      const { userId } = verifyMcpToken(token)
      const tasks = await TaskService.getTasks(userId)

      const filtered = status
        ? (tasks as Array<Record<string, unknown>>).filter(t => t.status === status)
        : tasks

      const result = (filtered as Array<Record<string, unknown>>).map(t => ({
        id: String(t._id),
        title: t.title,
        status: t.status,
        priority: t.priority ?? null,
        dueDate: t.dueDate ?? null,
        tags: t.tags ?? [],
        createdAt: t.createdAt,
      }))

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    } catch (err) {
      throw toMcpError(err)
    }
  })

  // ── create_task ───────────────────────────────────────────────────────────

  server.registerTool('create_task', {
    title: 'Create Task',
    description: 'Creates a new task in Life OS. Returns the created task with its ID.',
    inputSchema: {
      token: z.string().describe('Life OS JWT token'),
      title: z.string().min(1).max(500).describe('Task title (required)'),
      priority: z.enum(['low', 'medium', 'high']).optional().describe('Priority level'),
      dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
      tags: z.array(z.string().max(50)).max(10).optional().describe('Tags (max 10)'),
      notes: z.string().max(5000).optional().describe('Additional notes'),
    },
  }, async ({ token, title, priority, dueDate, tags, notes }) => {
    try {
      const { userId } = verifyMcpToken(token)

      if (dueDate && !DATE_RE.test(dueDate)) {
        throw new Error('dueDate must be in YYYY-MM-DD format')
      }

      const task = await TaskService.createTask(userId, {
        title,
        priority,
        dueDate,
        tags,
        notes,
      } as never)

      const t = task as unknown as Record<string, unknown>
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: String(t._id),
            title: t.title,
            status: t.status,
            priority: t.priority ?? null,
            dueDate: t.dueDate ?? null,
            tags: t.tags ?? [],
            createdAt: t.createdAt,
          }, null, 2),
        }],
      }
    } catch (err) {
      throw toMcpError(err)
    }
  })

  // ── complete_task ─────────────────────────────────────────────────────────

  server.registerTool('complete_task', {
    title: 'Complete Task',
    description: 'Marks a Life OS task as done. Awards XP if not previously completed. Safe to call multiple times — idempotent.',
    inputSchema: {
      token: z.string().describe('Life OS JWT token'),
      task_id: z.string().length(24).describe('The 24-character MongoDB task ID'),
    },
  }, async ({ token, task_id }) => {
    try {
      const { userId } = verifyMcpToken(token)
      const task = await TaskService.updateTask(userId, task_id, { status: 'done' } as never)

      const t = task as unknown as Record<string, unknown>
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: String(t._id),
            title: t.title,
            status: t.status,
            message: 'Task marked as complete',
          }, null, 2),
        }],
      }
    } catch (err) {
      throw toMcpError(err)
    }
  })
}
