import mongoose, { Schema, Document } from 'mongoose'

export interface IJournal extends Document {
  userId: mongoose.Types.ObjectId
  date: string
  title: string
  content: string
  mood: number
  energy: number
  highlights: string
  gratitude: string[]
  improvements: string
  tags: string[]
  createdAt: Date
}

const JournalSchema = new Schema<IJournal>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true },
  title: { type: String, default: '' },
  content: { type: String, default: '' },
  mood: { type: Number, min: 1, max: 5, default: 3 },
  energy: { type: Number, min: 1, max: 5, default: 3 },
  highlights: { type: String, default: '' },
  gratitude: [{ type: String }],
  improvements: { type: String, default: '' },
  tags: [{ type: String }],
}, { timestamps: true })

JournalSchema.index({ userId: 1, date: 1 }, { unique: true })

export const Journal = mongoose.model<IJournal>('Journal', JournalSchema)
