import mongoose, { Schema, Document } from 'mongoose'

export interface IGratitude extends Document {
  userId: mongoose.Types.ObjectId
  date: string
  items: string[]
  highlight: string
  mood: number
}

const GratitudeSchema = new Schema<IGratitude>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true, unique: false },
  items: [{ type: String }],
  highlight: { type: String, default: '' },
  mood: { type: Number, default: 3, min: 1, max: 5 },
}, { timestamps: true })

GratitudeSchema.index({ userId: 1, date: -1 })

export const Gratitude = mongoose.model<IGratitude>('Gratitude', GratitudeSchema)
