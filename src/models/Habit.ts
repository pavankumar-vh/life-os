import mongoose, { Schema, Document } from 'mongoose'

export interface IHabit extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  icon: string
  color: string
  frequency: 'daily' | 'weekly'
  completedDates: string[]
  streak: number
  bestStreak: number
  createdAt: Date
}

const HabitSchema = new Schema<IHabit>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  icon: { type: String, default: 'zap' },
  color: { type: String, default: '#FACC15' },
  frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
  completedDates: [{ type: String }],
  streak: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
}, { timestamps: true })

export const Habit = mongoose.models.Habit || mongoose.model<IHabit>('Habit', HabitSchema)
