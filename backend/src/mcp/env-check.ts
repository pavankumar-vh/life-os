/**
 * MCP Environment Validation
 * Checked at MCP server startup before anything else.
 */
import '../lib/env'  // loads dotenv

const required = ['JWT_SECRET', 'MONGODB_URI']
const missing = required.filter(k => !process.env[k])
if (missing.length > 0) {
  process.stderr.write(`[life-os-mcp] FATAL: Missing required env vars: ${missing.join(', ')}\n`)
  process.exit(1)
}
