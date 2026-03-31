import mongoose, { Schema, Document } from 'mongoose'

export interface ISleepLog extends Document {
  userId: mongoose.Types.ObjectId
  date: string
  bedtime: string
  waketime: string
  hours: number
  quality: number
  notes?: string
  createdAt: Date
}

const SleepLogSchema = new Schema<ISleepLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true },
  bedtime: { type: String, required: true },
  waketime: { type: String, required: true },
  hours: { type: Number, required: true },
  quality: { type: Number, min: 1, max: 5, default: 3 },
  notes: { type: String, default: '' },
}, { timestamps: true })

export const SleepLog = mongoose.model<ISleepLog>('SleepLog', SleepLogSchema)
