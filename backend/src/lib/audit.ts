import { AuditLog, ActivityEventType, ActivitySource } from '../models/AuditLog'

/**
 * Fire-and-forget audit log writer.
 *
 * Logs every data mutation to the auditlogs MongoDB collection.
 * Never throws — failures are silently logged to console.
 *
 * V2 (feat/activity-foundation): accepts optional `eventType`, `source`,
 * and `metadata` for richer activity tracing.
 * All callers written before V2 continue to work unchanged — the new
 * fields default to null / 'manual'.
 */
export function audit(
  userId: string,
  action: 'create' | 'update' | 'delete',
  collectionName: string,
  documentId: unknown,
  opts: {
    before?:    Record<string, unknown> | null
    after?:     Record<string, unknown> | null
    changes?:   Record<string, unknown> | null
    // ── V2 enrichment (all optional for backward-compat) ──────────────────
    /** Semantic event label, e.g. "task.completed". Leave undefined to omit. */
    eventType?: ActivityEventType
    /** How the action was triggered. Defaults to 'manual'. */
    source?:    ActivitySource
    /** Extra context for this event (entity title, priority, etc.) */
    metadata?:  Record<string, unknown>
  } = {}
) {
  AuditLog.create({
    userId,
    action,
    collectionName,
    documentId:    String(documentId),
    before:        opts.before    ?? null,
    after:         opts.after     ?? null,
    changes:       opts.changes   ?? null,
    eventType:     opts.eventType ?? null,
    source:        opts.source    ?? 'manual',
    metadata:      opts.metadata  ?? null,
  }).catch((err) => console.error('[AUDIT] Failed to write audit log:', err.message))
}
