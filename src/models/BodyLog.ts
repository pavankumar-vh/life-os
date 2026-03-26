import mongoose, { Schema, Document } from 'mongoose'

export interface IBodyLog extends Document {
  userId: mongoose.Types.ObjectId
  date: string
  weight?: number
  bodyFat?: number
  measurements?: {
    chest?: number
    waist?: number
    hips?: number
    arms?: number
    thighs?: number
  }
  notes?: string
  createdAt: Date
}

const BodyLogSchema = new Schema<IBodyLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true },
  weight: { type: Number },
  bodyFat: { type: Number },
  measurements: {
    chest: Number,
    waist: Number,
    hips: Number,
    arms: Number,
    thighs: Number,
  },
  notes: { type: String, default: '' },
}, { timestamps: true })

export const BodyLog = mongoose.models.BodyLog || mongoose.model<IBodyLog>('BodyLog', BodyLogSchema)
