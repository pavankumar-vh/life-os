import mongoose, { Schema, Document } from 'mongoose'

export interface IWhiteboard extends Document {
  userId: mongoose.Types.ObjectId
  title: string
  snapshot: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const WhiteboardSchema = new Schema<IWhiteboard>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'Untitled Board' },
  snapshot: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true })

export const Whiteboard = mongoose.model<IWhiteboard>('Whiteboard', WhiteboardSchema)
