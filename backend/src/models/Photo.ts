import mongoose, { Schema, Document } from 'mongoose'

export interface IPhoto extends Document {
  userId: mongoose.Types.ObjectId
  url: string           // Public B2 URL
  key: string           // B2 storage key (for deletion)
  context: 'note' | 'journal' | 'wishlist' | 'workout' | 'general'
  refId?: string        // ID of the parent document
  filename: string
  sizeBytes: number
  mimeType: string
  createdAt: Date
}

const PhotoSchema = new Schema<IPhoto>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  url: { type: String, required: true },
  key: { type: String, required: true },
  context: {
    type: String,
    enum: ['note', 'journal', 'wishlist', 'workout', 'general'],
    default: 'general',
  },
  refId: { type: String },
  filename: { type: String, required: true },
  sizeBytes: { type: Number, required: true },
  mimeType: { type: String, required: true },
}, { timestamps: true })

export const Photo = mongoose.model<IPhoto>('Photo', PhotoSchema)
