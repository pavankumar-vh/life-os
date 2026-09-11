import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerTaskTools }    from './tools/tasks'
import { registerHabitTools }   from './tools/habits'
import { registerCaptureTools } from './tools/captures'
import { registerGoalTools }    from './tools/goals'
import { registerProjectTools } from './tools/projects'
import { registerTodayTool }    from './tools/today'
import { registerSearchTool }   from './tools/search'
import { registerVaultTools }   from './tools/vault'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../../package.json') as { version: string }

export function createMcpServer() {
  const server = new McpServer(
    {
      name: 'life-os-mcp',
      version,
    },
    {
      capabilities: {
        tools: {},
      },
      instructions: [
        'This is the Life OS MCP server. It gives you access to your personal second-brain.',
        'Every tool requires a "token" argument — your Life OS JWT or Dedicated MCP Token.',
        'Tools are user-scoped: you can only access your own data.',
        'Use quick_capture to save thoughts. Use get_today for a situational overview.',
        'Use search_life to find anything across your Life OS.',
      ].join('\n'),
    }
  )

  registerTaskTools(server)
  registerHabitTools(server)
  registerCaptureTools(server)
  registerGoalTools(server)
  registerProjectTools(server)
  registerTodayTool(server)
  registerSearchTool(server)
  registerVaultTools(server)

  return server
}
