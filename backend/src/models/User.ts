import mongoose, { Schema, Document } from 'mongoose'

// Encrypted field stored as { iv, tag, data } objects
interface EncryptedField {
  iv: string
  tag: string
  data: string
}

export interface IUser extends Document {
  email: string
  password: string
  name: string
  xp: number
  level: number
  googleTokens?: {
    access_token: EncryptedField | string  // encrypted
    refresh_token?: EncryptedField | string // encrypted
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
    aiKeys: Record<string, EncryptedField | string>  // encrypted
    lastBackup: string | null
  }
  passwordResetToken?: string
  passwordResetExpires?: Date
  createdAt: Date
}

const EncryptedFieldSchema = {
  iv: String,
  tag: String,
  data: String,
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  name: { type: String, required: true, trim: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  googleTokens: {
    access_token: Schema.Types.Mixed,   // string or EncryptedField
    refresh_token: Schema.Types.Mixed,  // string or EncryptedField
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
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
}, { timestamps: true })

export const User = mongoose.model<IUser>('User', UserSchema)
