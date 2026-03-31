import mongoose, { Schema, Document } from 'mongoose'

export interface IProject extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  description: string
  status: 'active' | 'completed' | 'archived' | 'on-hold'
  color: string
  progress: number
  deadline: string | null
  tasks: { text: string; done: boolean }[]
}

const ProjectSchema = new Schema<IProject>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['active', 'completed', 'archived', 'on-hold'], default: 'active' },
  color: { type: String, default: '#e8d5b7' },
  progress: { type: Number, default: 0 },
  deadline: { type: String, default: null },
  tasks: [{ text: { type: String }, done: { type: Boolean, default: false } }],
}, { timestamps: true })

export const Project = mongoose.model<IProject>('Project', ProjectSchema)
