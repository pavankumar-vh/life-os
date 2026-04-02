import mongoose, { Schema, Document } from 'mongoose'

export interface IUser extends Document {
  email: string
  password: string
  name: string
  xp: number
  level: number
  googleTokens?: {
    access_token: string
    refresh_token?: string
    expiry_date?: number
  }
  settings: {
    accentColor: string
    goals: {
      calories: number
      protein: number
      carbs: number
      fat: number
      water: number
      sleep: number
      steps: number
      workoutsPerWeek: number
    }
    aiProvider: string
    aiModels: Record<string, string>
    aiKeys: Record<string, string>
    lastBackup: string | null
  }
  createdAt: Date
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  name: { type: String, required: true, trim: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  googleTokens: {
    access_token: String,
    refresh_token: String,
    expiry_date: Number,
  },
  settings: {
    type: Schema.Types.Mixed,
    default: {
      accentColor: '#e8d5b7',
      goals: { calories: 2200, protein: 150, carbs: 250, fat: 70, water: 8, sleep: 8, steps: 10000, workoutsPerWeek: 4 },
      aiProvider: 'openai',
      aiModels: {},
      aiKeys: {},
      lastBackup: null,
    },
  },
}, { timestamps: true })

export const User = mongoose.model<IUser>('User', UserSchema)
