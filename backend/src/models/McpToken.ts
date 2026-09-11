import mongoose, { Schema, Document } from 'mongoose'

export interface IMcpToken extends Document {
  name: string
  userId: mongoose.Types.ObjectId
  tokenHash: string
  scopes: string[]
  isRevoked: boolean
  lastUsedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const McpTokenSchema = new Schema<IMcpToken>({
  name: { type: String, required: true, trim: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, select: false },
  scopes: { type: [String], default: [] },
  isRevoked: { type: Boolean, default: false },
  lastUsedAt: { type: Date },
}, { timestamps: true })

// Compound index for efficient queries per user
McpTokenSchema.index({ userId: 1, isRevoked: 1 })

export const McpToken = mongoose.model<IMcpToken>('McpToken', McpTokenSchema)
