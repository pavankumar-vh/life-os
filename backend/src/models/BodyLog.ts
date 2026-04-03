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
    arms?: number // legacy
    leftArm?: number
    rightArm?: number
    thighs?: number // legacy
    leftThigh?: number
    rightThigh?: number
    neck?: number
    shoulders?: number
    forearms?: number // legacy
    leftForearm?: number
    rightForearm?: number
    calves?: number // legacy
    leftCalf?: number
    rightCalf?: number
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
    leftArm: Number,
    rightArm: Number,
    thighs: Number,
    leftThigh: Number,
    rightThigh: Number,
    neck: Number,
    shoulders: Number,
    forearms: Number,
    leftForearm: Number,
    rightForearm: Number,
    calves: Number,
    leftCalf: Number,
    rightCalf: Number,
  },
  notes: { type: String, default: '' },
}, { timestamps: true })

BodyLogSchema.index({ userId: 1, date: 1 }, { unique: true })

export const BodyLog = mongoose.model<IBodyLog>('BodyLog', BodyLogSchema)
