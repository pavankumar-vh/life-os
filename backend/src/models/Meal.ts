import mongoose, { Schema, Document } from 'mongoose'

export interface IMeal extends Document {
  userId: mongoose.Types.ObjectId
  date: string
  name: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  createdAt: Date
}

const MealSchema = new Schema<IMeal>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'], required: true },
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  fiber: { type: Number, default: 0 },
  sugar: { type: Number, default: 0 },
}, { timestamps: true })

MealSchema.index({ userId: 1, date: 1 })

export const Meal = mongoose.model<IMeal>('Meal', MealSchema)
