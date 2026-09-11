import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { verifyMcpToken } from '../auth'
import { toMcpError } from '../errors'
import { VaultFile } from '../../models/VaultFile'
import { generatePresignedDownloadUrl, deleteFromB2 } from '../../lib/b2'

export function registerVaultTools(server: McpServer): void {

  // ── list_vault_files ─────────────────────────────────────────────────────────

  server.registerTool('list_vault_files', {
    title: 'List Vault Files',
    description: 'Lists files in the user\'s vault (e.g. documents, PDFs, images). EXCLUDES Private Zone files.',
    inputSchema: {
      token: z.string().describe('Life OS JWT token'),
      folder: z.string().optional().describe('Filter by exact folder name (e.g. "Root", "Documents")'),
      search: z.string().optional().describe('Search query for file names'),
      limit: z.number().max(100).optional().describe('Maximum number of files to return (max 100)'),
    } as any,
  }, async ({ token, folder, search, limit }: any) => {
    try {
      const { userId } = await verifyMcpToken(token)

      // CRITICAL: Ensure Private Zone files are never returned
      const query: Record<string, unknown> = { userId, visibility: 'standard' }
      if (folder) query.folder = folder
      if (search) query.name = { $regex: search, $options: 'i' }

      const files = await VaultFile.find(query)
        .sort({ createdAt: -1 })
        .limit(limit ?? 20)
        .lean()

      const withUrls = await Promise.all(
        files.map(async f => ({
          id: f._id,
          name: f.name,
          folder: f.folder,
          fileType: f.fileType,
          mimeType: f.mimeType,
          sizeBytes: f.sizeBytes,
          tags: f.tags,
          createdAt: f.createdAt,
          downloadUrl: await generatePresignedDownloadUrl(f.key)
        }))
      )

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(withUrls, null, 2) }]
      }
    } catch (err) {
      throw toMcpError(err)
    }
  })

  // ── delete_vault_file ─────────────────────────────────────────────────────────

  server.registerTool('delete_vault_file', {
    title: 'Delete Vault File',
    description: 'Deletes a standard file from the user\'s vault.',
    inputSchema: {
      token: z.string().describe('Life OS JWT token'),
      fileId: z.string().describe('ID of the file to delete'),
    } as any,
  }, async ({ token, fileId }: any) => {
    try {
      const { userId } = await verifyMcpToken(token)

      // CRITICAL: Ensure Private Zone files cannot be deleted via MCP
      const file = await VaultFile.findOne({ _id: fileId, userId, visibility: 'standard' })
      if (!file) throw new Error('File not found or access denied')

      await deleteFromB2(file.key)
      await VaultFile.deleteOne({ _id: file._id })

      return {
        content: [{ type: 'text' as const, text: 'File deleted successfully' }]
      }
    } catch (err) {
      throw toMcpError(err)
    }
  })
}
