import mongoose, { Schema, Document } from 'mongoose'

export interface IFolder extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  createdAt: Date
  updatedAt: Date
}

const FolderSchema = new Schema<IFolder>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:   { type: String, required: true },
}, { timestamps: true })

FolderSchema.index({ userId: 1, name: 1 }, { unique: true })

export const Folder = mongoose.model<IFolder>('Folder', FolderSchema)
