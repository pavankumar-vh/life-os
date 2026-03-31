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
}, { timestamps: true })

export const User = mongoose.model<IUser>('User', UserSchema)
