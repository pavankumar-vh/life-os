/**
 * MCP Tools — Habits
 *
 * Tools:
 *   get_habits  — list all habits
 *   log_habit   — mark a habit complete for a date (idempotent)
 *
 * All tools require a `token` argument (Life OS JWT).
 */

import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { verifyMcpToken } from '../auth'
import { toMcpError } from '../errors'
import { HabitService } from '../../services/HabitService'
import { toISODate } from '../../lib/utils'

export function registerHabitTools(server: McpServer): void {

  // ── get_habits ────────────────────────────────────────────────────────────

  server.registerTool('get_habits', {
    title: 'Get Habits',
    description: 'Returns all habits for the authenticated Life OS user, with their completion dates.',
    inputSchema: {
      token: z.string().describe('Life OS JWT token'),
    } as any,
  }, async ({ token }: { token: string }) => {
    try {
      const { userId } = verifyMcpToken(token)
      const habits = await HabitService.getHabits(userId)

      const result = (habits as Array<Record<string, unknown>>).map(h => ({
        id: String(h._id),
        name: h.name,
        icon: h.icon ?? null,
        frequency: h.frequency ?? 'daily',
        completedDates: h.completedDates ?? [],
      }))

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    } catch (err) {
      throw toMcpError(err)
    }
  })

  // ── log_habit ─────────────────────────────────────────────────────────────

  server.registerTool('log_habit', {
    title: 'Log Habit Completion',
    description: 'Marks a habit as complete for a given date. Idempotent — safe to call multiple times for the same date. Awards XP on first completion.',
    inputSchema: {
      token: z.string().describe('Life OS JWT token'),
      habit_id: z.string().length(24).describe('The 24-character MongoDB habit ID'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
        .describe('Date in YYYY-MM-DD format. Defaults to today (UTC).'),
    } as any,
  }, async ({ token, habit_id, date }: { token: string; habit_id: string; date?: string }) => {
    try {
      const { userId } = verifyMcpToken(token)
      const targetDate = date ?? toISODate()
      const habit = await HabitService.logCompletion(userId, habit_id, targetDate)

      const h = habit as unknown as Record<string, unknown>
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            id: String(h._id),
            name: h.name,
            date: targetDate,
            message: `Habit "${h.name}" logged for ${targetDate}`,
          }, null, 2),
        }],
      }
    } catch (err) {
      throw toMcpError(err)
    }
  })
}
