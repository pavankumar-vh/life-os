/**
 * MCP Tools — Today Dashboard
 *
 * Tools:
 *   get_today — returns a summary of today's state
 *
 * Replicates the today route logic without going through HTTP.
 * Uses the same models and scoping patterns as the REST endpoint.
 */

import { z } from 'zod'
import mongoose from 'mongoose'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { verifyMcpToken } from '../auth'
import { toMcpError } from '../errors'
import { Task }    from '../../models/Task'
import { Goal }    from '../../models/Goal'
import { Habit }   from '../../models/Habit'
import { Journal } from '../../models/Journal'
import { Capture } from '../../models/Capture'
import { Project } from '../../models/Project'

function localDateString(offsetMinutes: number): string {
  const now = new Date()
  const local = new Date(now.getTime() + offsetMinutes * 60000)
  return local.toISOString().slice(0, 10)
}

export function registerTodayTool(server: McpServer): void {

  server.registerTool('get_today', {
    title: 'Get Today Overview',
    description: 'Returns a complete overview of today\'s Life OS state: tasks, habits, goals, journal, inbox captures, and active projects.',
    inputSchema: {
      token: z.string().describe('Life OS JWT token'),
      tz: z.number().int().min(-840).max(840).optional()
        .describe('Timezone offset in minutes ahead of UTC (e.g. 330 for UTC+5:30). Defaults to 0 (UTC).'),
    } as any,
  }, async ({ token, tz }: { token: string; tz?: number }) => {
    try {
      const { userId } = verifyMcpToken(token)
      const userObjId = new mongoose.Types.ObjectId(userId)
      const tzOffset = tz ?? 0
      const today = localDateString(tzOffset)

      const [tasks, goals, habits, journal, captures, projects] = await Promise.all([
        Task.find({ userId: userObjId }).lean(),
        Goal.find({ userId: userObjId }).lean(),
        Habit.find({ userId: userObjId }).lean(),
        Journal.findOne({ userId: userObjId, date: today }).lean(),
        Capture.find({ userId: userObjId, processed: false })
          .sort({ createdAt: -1 }).limit(5).lean(),
        Project.find({ userId: userObjId, status: 'active' }).lean(),
      ])

      const todayTasks   = tasks.filter(t => t.dueDate && t.dueDate.slice(0, 10) === today)
      const overdueTasks = tasks
        .filter(t => t.status !== 'done' && t.dueDate && t.dueDate.slice(0, 10) < today)
        .slice(0, 5)

      const habitsTotal     = habits.length
      const habitsCompleted = habits.filter(h => (h.completedDates || []).includes(today)).length
      const inboxTotal      = await Capture.countDocuments({ userId: userObjId, processed: false })

      const summary = {
        date: today,
        tasks: {
          today: {
            total: todayTasks.length,
            done:  todayTasks.filter(t => t.status === 'done').length,
            open:  todayTasks.filter(t => t.status !== 'done').map(t => ({
              id: String(t._id), title: t.title, priority: t.priority,
            })),
          },
          overdue: overdueTasks.map(t => ({
            id: String(t._id), title: t.title, dueDate: t.dueDate,
          })),
          overdueTotalCount: tasks.filter(
            t => t.status !== 'done' && t.dueDate && t.dueDate.slice(0, 10) < today
          ).length,
        },
        habits: {
          total: habitsTotal,
          completed: habitsCompleted,
          pending: habitsTotal - habitsCompleted,
          percent: habitsTotal > 0 ? Math.round((habitsCompleted / habitsTotal) * 100) : 0,
        },
        goals: {
          activeCount: goals.filter(g => g.status === 'active').length,
          completedCount: goals.filter(g => g.status === 'completed').length,
        },
        journal: journal
          ? { exists: true, title: journal.title, mood: journal.mood, date: journal.date }
          : { exists: false },
        inbox: {
          count: inboxTotal,
          preview: captures.map(c => ({
            id: String(c._id),
            text: c.text.slice(0, 80),
            type: c.type,
          })),
        },
        projects: projects.slice(0, 3).map(p => ({
          id: String(p._id),
          name: p.name,
          status: p.status,
          progress: p.progress,
        })),
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }],
      }
    } catch (err) {
      throw toMcpError(err)
    }
  })
}
