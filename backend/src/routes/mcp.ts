import { Router, Request, Response } from 'express'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { createMcpServer } from '../mcp/server'

const router = Router()

// We create a single server instance for SSE
const server = createMcpServer()
let sseTransport: SSEServerTransport | null = null

// GET /api/mcp/sse
router.get('/sse', async (req: Request, res: Response) => {
  try {
    sseTransport = new SSEServerTransport('/api/mcp/messages', res as any)
    await server.connect(sseTransport)
  } catch (error) {
    console.error('SSE Connection error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to establish SSE connection' })
    }
  }
})

// POST /api/mcp/messages
router.post('/messages', async (req: Request, res: Response) => {
  try {
    if (!sseTransport) {
      return res.status(400).json({ error: 'No active SSE connection' })
    }
    await sseTransport.handlePostMessage(req, res as any)
  } catch (error) {
    console.error('SSE Message error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process message' })
    }
  }
})

export default router
