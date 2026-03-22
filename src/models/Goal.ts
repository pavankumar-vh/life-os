import mongoose, { Schema, Document } from 'mongoose'

export interface IGoal extends Document {
  userId: mongoose.Types.ObjectId
  title: string
  description: string
  category: string
  progress: number
  target: number
  unit: string
  deadline: string | null
  status: 'active' | 'completed' | 'paused'
  createdAt: Date
}

const GoalSchema = new Schema<IGoal>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'general' },
  progress: { type: Number, default: 0 },
  target: { type: Number, default: 100 },
  unit: { type: String, default: '%' },
  deadline: { type: String, default: null },
  status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
}, { timestamps: true })

export const Goal = mongoose.models.Goal || mongoose.model<IGoal>('Goal', GoalSchema)
