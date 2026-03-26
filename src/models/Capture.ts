import mongoose, { Schema, Document } from 'mongoose'

export interface ICapture extends Document {
  userId: mongoose.Types.ObjectId
  text: string
  type: 'thought' | 'idea' | 'todo' | 'reminder'
  processed: boolean
  createdAt: Date
}

const CaptureSchema = new Schema<ICapture>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text: { type: String, required: true },
  type: { type: String, enum: ['thought', 'idea', 'todo', 'reminder'], default: 'thought' },
  processed: { type: Boolean, default: false },
}, { timestamps: true })

export const Capture = mongoose.models.Capture || mongoose.model<ICapture>('Capture', CaptureSchema)
