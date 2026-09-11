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
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { connectDB } from '../lib/db'
import { createMcpServer } from './server'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../../package.json') as { version: string }

async function main() {
  await connectDB()

  const server = createMcpServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)

  process.stderr.write(`[life-os-mcp] v${version} ready (stdio)\n`)
}

main().catch((err) => {
  process.stderr.write(`[life-os-mcp] Fatal error: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
