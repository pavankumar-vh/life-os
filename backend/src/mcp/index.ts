/**
 * Life OS — Universal MCP Server
 * ───────────────────────────────
 * Exposes Life OS capabilities through the Model Context Protocol.
 *
 * Architecture:
 *   MCP Client (Claude Desktop, Inspector, etc.)
 *       ↓ stdio
 *   This MCP Server
 *       ↓ token verification
 *   Life OS Services (TaskService, HabitService, etc.)
 *       ↓
 *   MongoDB
 *
 * Transport: stdio (stdin/stdout)
 * Auth:      Life OS JWT (30-day) passed as `token` in every tool call
 * User isolation: all DB queries use userId derived from the verified token
 *
 * Usage:
 *   node dist/mcp/index.js
 *   # or during development:
 *   tsx src/mcp/index.ts
 *
 * See MCP.md for full documentation.
 */

import './env-check'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { connectDB } from '../lib/db'

// ── Tool registrations ────────────────────────────────────────────────────────
import { registerTaskTools }    from './tools/tasks'
import { registerHabitTools }   from './tools/habits'
import { registerCaptureTools } from './tools/captures'
import { registerGoalTools }    from './tools/goals'
import { registerProjectTools } from './tools/projects'
import { registerTodayTool }    from './tools/today'
import { registerSearchTool }   from './tools/search'

// ── Resource registrations ────────────────────────────────────────────────────
// Resources require userId context — they are registered after token resolution
// in this MVP by accepting token as a parameter.
// Note: Static resources using a placeholder userId are registered at startup.
// For full per-user resource isolation a future version should use dynamic
// resource templates or require all resource reads to go through tools.

// ── Package version ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../../package.json') as { version: string }

async function main() {
  // Connect to MongoDB — the MCP server needs the same DB as the REST API
  await connectDB()

  const server = new McpServer(
    {
      name: 'life-os-mcp',
      version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions: [
        'This is the Life OS MCP server. It gives you access to your personal second-brain.',
        'Every tool requires a "token" argument — your Life OS JWT from /api/auth/login.',
        'Tools are user-scoped: you can only access your own data.',
        'Use quick_capture to save thoughts. Use get_today for a situational overview.',
        'Use search_life to find anything across your Life OS.',
      ].join('\n'),
    }
  )

  // Register all tools
  registerTaskTools(server)
  registerHabitTools(server)
  registerCaptureTools(server)
  registerGoalTools(server)
  registerProjectTools(server)
  registerTodayTool(server)
  registerSearchTool(server)

  // Connect to stdio transport
  const transport = new StdioServerTransport()
  await server.connect(transport)

  // Log to stderr so stdout stays clean for MCP protocol
  process.stderr.write(`[life-os-mcp] v${version} ready (stdio)\n`)
}

main().catch((err) => {
  process.stderr.write(`[life-os-mcp] Fatal error: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
