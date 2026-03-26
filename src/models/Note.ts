import mongoose, { Schema, Document } from 'mongoose'

export interface INote extends Document {
  userId: mongoose.Types.ObjectId
  title: string
  content: string
  folder: string
  tags: string[]
  pinned: boolean
  createdAt: Date
  updatedAt: Date
}

const NoteSchema = new Schema<INote>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  folder: { type: String, default: 'General' },
  tags: [{ type: String }],
  pinned: { type: Boolean, default: false },
}, { timestamps: true })

export const Note = mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema)
