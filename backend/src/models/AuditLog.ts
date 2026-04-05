import mongoose, { Schema, Document } from 'mongoose'

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId | string
  action: 'create' | 'update' | 'delete'
  collectionName: string
  documentId: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  changes: Record<string, unknown> | null
  timestamp: Date
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: { type: Schema.Types.Mixed, required: true, index: true },
  action: { type: String, enum: ['create', 'update', 'delete'], required: true },
  collectionName: { type: String, required: true, index: true },
  documentId: { type: String, required: true },
  before: { type: Schema.Types.Mixed, default: null },
  after: { type: Schema.Types.Mixed, default: null },
  changes: { type: Schema.Types.Mixed, default: null },
  timestamp: { type: Date, default: Date.now, index: true },
})

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)
