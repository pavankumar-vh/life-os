import mongoose, { Schema, Document } from 'mongoose'

export interface IBookmark extends Document {
  userId: mongoose.Types.ObjectId
  url: string
  title: string
  description: string
  folder: string
  tags: string[]
  favicon: string
}

const BookmarkSchema = new Schema<IBookmark>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  url: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  folder: { type: String, default: 'Unsorted' },
  tags: [{ type: String }],
  favicon: { type: String, default: '' },
}, { timestamps: true })

export const Bookmark = mongoose.models.Bookmark || mongoose.model<IBookmark>('Bookmark', BookmarkSchema)
