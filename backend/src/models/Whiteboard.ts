import mongoose, { Schema, Document } from 'mongoose'

export interface IWhiteboardFolder extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  parentId: mongoose.Types.ObjectId | null
  color: string
  createdAt: Date
  updatedAt: Date
}

const WhiteboardFolderSchema = new Schema<IWhiteboardFolder>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, default: 'New Folder' },
  parentId: { type: Schema.Types.ObjectId, ref: 'WhiteboardFolder', default: null },
  color: { type: String, default: '#e8d5b7' },
}, { timestamps: true })

export const WhiteboardFolder = mongoose.model<IWhiteboardFolder>('WhiteboardFolder', WhiteboardFolderSchema)

export interface IWhiteboard extends Document {
  userId: mongoose.Types.ObjectId
  title: string
  folderId: mongoose.Types.ObjectId | null
  snapshot: Record<string, unknown>
  thumbnail: string
  createdAt: Date
  updatedAt: Date
}

const WhiteboardSchema = new Schema<IWhiteboard>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, default: 'Untitled Board' },
  folderId: { type: Schema.Types.ObjectId, ref: 'WhiteboardFolder', default: null },
  snapshot: { type: Schema.Types.Mixed, default: {} },
  thumbnail: { type: String, default: '' },
}, { timestamps: true })

export const Whiteboard = mongoose.model<IWhiteboard>('Whiteboard', WhiteboardSchema)
