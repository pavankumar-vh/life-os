import mongoose, { Schema, Document } from 'mongoose'

export interface ITask extends Document {
  userId: mongoose.Types.ObjectId
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'todo' | 'in-progress' | 'done'
  dueDate: string | null
  goalId: mongoose.Types.ObjectId | null
  createdAt: Date
}

const TaskSchema = new Schema<ITask>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  dueDate: { type: String, default: null },
  goalId: { type: Schema.Types.ObjectId, ref: 'Goal', default: null },
}, { timestamps: true })

export const Task = mongoose.model<ITask>('Task', TaskSchema)
