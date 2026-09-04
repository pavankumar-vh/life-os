import mongoose, { Schema, Document } from 'mongoose'

export type CaptureSource = 'manual' | 'api' | 'import' | 'automation' | 'mcp' | 'future_mcp' | 'future_agent'
export type CaptureType = 'thought' | 'idea' | 'todo' | 'reminder'

export interface ICapture extends Document {
  userId: mongoose.Types.ObjectId
  /** Raw text exactly as the user entered it */
  text: string
  type: CaptureType
  source: CaptureSource
  processed: boolean
  /** Free-form tags added by the user at capture time */
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

const CaptureSchema = new Schema<ICapture>({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text:      { type: String, required: true, trim: true },
  type:      { type: String, enum: ['thought', 'idea', 'todo', 'reminder'], default: 'thought' },
  source:    {
    type: String,
    enum: ['manual', 'api', 'import', 'automation', 'mcp', 'future_mcp', 'future_agent'],
    default: 'manual',
  },
  processed: { type: Boolean, default: false, index: true },
  tags:      [{ type: String, trim: true }],
}, { timestamps: true })

// Full-text search index on text and tags
CaptureSchema.index({ userId: 1, createdAt: -1 })
CaptureSchema.index({ userId: 1, text: 'text', tags: 'text' })

export const Capture = mongoose.model<ICapture>('Capture', CaptureSchema)
