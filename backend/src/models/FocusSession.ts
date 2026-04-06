import mongoose, { Schema, Document } from 'mongoose'

export interface IFocusSession extends Document {
  userId: mongoose.Types.ObjectId
  mode: 'focus' | 'break'
  duration: number // in minutes
  completedAt: Date
  createdAt: Date
}

const FocusSessionSchema = new Schema<IFocusSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  mode: { type: String, enum: ['focus', 'break'], default: 'focus' },
  duration: { type: Number, required: true },
  completedAt: { type: Date, default: Date.now },
}, { timestamps: true })

export const FocusSession = mongoose.model<IFocusSession>('FocusSession', FocusSessionSchema)
