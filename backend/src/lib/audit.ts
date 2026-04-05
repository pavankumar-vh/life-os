import { AuditLog } from '../models/AuditLog'

/**
 * Fire-and-forget audit log writer.
 * Logs every data mutation to the auditlogs MongoDB collection.
 * Never throws — failures are silently logged to console.
 */
export function audit(
  userId: string,
  action: 'create' | 'update' | 'delete',
  collectionName: string,
  documentId: unknown,
  opts: {
    before?: Record<string, unknown> | null
    after?: Record<string, unknown> | null
    changes?: Record<string, unknown> | null
  } = {}
) {
  AuditLog.create({
    userId,
    action,
    collectionName,
    documentId: String(documentId),
    before: opts.before ?? null,
    after: opts.after ?? null,
    changes: opts.changes ?? null,
  }).catch((err) => console.error('[AUDIT] Failed to write audit log:', err.message))
}
