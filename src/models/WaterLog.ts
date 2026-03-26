import mongoose, { Schema, Document } from 'mongoose'

export interface IWaterLog extends Document {
  userId: mongoose.Types.ObjectId
  date: string
  glasses: number
  goal: number
}

const WaterLogSchema = new Schema<IWaterLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true },
  glasses: { type: Number, default: 0 },
  goal: { type: Number, default: 8 },
}, { timestamps: true })

export const WaterLog = mongoose.models.WaterLog || mongoose.model<IWaterLog>('WaterLog', WaterLogSchema)
