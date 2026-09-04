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

// ── Resources ─────────────────────────────────────────────────────────────────
// Resources are NOT registered in v1.
//
// MCP Resources require a static URI at registration time, but Life OS resources
// need per-request user identity (token) to scope queries. This creates a
// fundamental mismatch: the resource URI cannot carry auth context.
//
// The get_today and get_captures tools cover the same functionality with proper
// per-user authentication.
//
// Future improvement: ResourceTemplate with token in the URI path, e.g.
//   life://users/{token}/today
// See the resource files in src/mcp/resources/ for the prepared implementations.

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
        // Note: Resources are not advertised in v1.
        // MCP Resources require a static URI without per-call auth context.
        // The get_today and get_captures tools cover the same functionality
        // with proper per-user token authentication.
        // See MCP.md for the future ResourceTemplate approach.
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
