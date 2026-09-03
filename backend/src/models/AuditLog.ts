import mongoose, { Schema, Document } from 'mongoose'

// ─── Source values ──────────────────────────────────────────────────────────
// Represents how the action was initiated.
// "mcp" and "agent" are future-facing — do not use today.
export type ActivitySource =
  | 'manual'
  | 'api'
  | 'import'
  | 'sync'
  | 'automation'
  | 'mcp'
  | 'agent'

// ─── Semantic event types ───────────────────────────────────────────────────
// Format: "<entity>.<action>" — provides queryable, human-readable labels
// for important Life OS actions beyond the raw create/update/delete.
export type ActivityEventType =
  // Tasks
  | 'task.created'
  | 'task.completed'
  | 'task.updated'
  | 'task.deleted'
  // Goals
  | 'goal.created'
  | 'goal.updated'
  | 'goal.completed'
  | 'goal.deleted'
  // Habits
  | 'habit.created'
  | 'habit.completed'
  | 'habit.uncompleted'
  | 'habit.updated'
  | 'habit.deleted'
  // Notes
  | 'note.created'
  | 'note.updated'
  | 'note.deleted'
  // Journal
  | 'journal.created'
  | 'journal.updated'
  | 'journal.deleted'
  // Workouts
  | 'workout.logged'
  | 'workout.updated'
  | 'workout.deleted'
  // Expenses
  | 'expense.logged'
  | 'expense.deleted'
  // Captures
  | 'capture.created'
  | 'capture.processed'
  | 'capture.deleted'
  // Projects
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  // Generic fallback — preserves backward-compat with pre-enrichment audit rows
  | 'generic.create'
  | 'generic.update'
  | 'generic.delete'

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId | string
  action: 'create' | 'update' | 'delete'
  collectionName: string
  documentId: string
  // ── Activity enrichment fields (added in feat/activity-foundation) ─────────
  /** Semantic event type. Null on legacy rows written before this migration. */
  eventType: ActivityEventType | null
  /** Who/what triggered the action. Defaults to "manual". */
  source: ActivitySource
  /** Arbitrary key-value pairs for per-event context (entity title, priority, etc.) */
  metadata: Record<string, unknown> | null
  // ── Original fields ────────────────────────────────────────────────────────
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  changes: Record<string, unknown> | null
  timestamp: Date
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId:         { type: Schema.Types.Mixed, required: true, index: true },
  action:         { type: String, enum: ['create', 'update', 'delete'], required: true },
  collectionName: { type: String, required: true, index: true },
  documentId:     { type: String, required: true },
  // Activity enrichment
  eventType: {
    type: String,
    default: null,
    index: true,
    // Sparse index only covers non-null rows — efficient for new records
  },
  source: {
    type: String,
    enum: ['manual', 'api', 'import', 'sync', 'automation', 'mcp', 'agent'],
    default: 'manual',
    index: true,
  },
  metadata: { type: Schema.Types.Mixed, default: null },
  // Original fields
  before:  { type: Schema.Types.Mixed, default: null },
  after:   { type: Schema.Types.Mixed, default: null },
  changes: { type: Schema.Types.Mixed, default: null },
  timestamp: { type: Date, default: Date.now, index: true },
})

// Compound index for activity feed queries: user + time, user + eventType + time
AuditLogSchema.index({ userId: 1, timestamp: -1 })
AuditLogSchema.index({ userId: 1, eventType: 1, timestamp: -1 })
AuditLogSchema.index({ userId: 1, source: 1, timestamp: -1 })

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)
