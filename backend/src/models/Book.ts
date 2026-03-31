import mongoose, { Schema, Document } from 'mongoose'

export interface IBook extends Document {
  userId: mongoose.Types.ObjectId
  title: string
  author: string
  status: 'reading' | 'completed' | 'want-to-read' | 'dropped'
  rating: number
  pagesRead: number
  totalPages: number
  notes: string
  startDate: string | null
  finishDate: string | null
}

const BookSchema = new Schema<IBook>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  status: { type: String, enum: ['reading', 'completed', 'want-to-read', 'dropped'], default: 'want-to-read' },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  pagesRead: { type: Number, default: 0 },
  totalPages: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  startDate: { type: String, default: null },
  finishDate: { type: String, default: null },
}, { timestamps: true })

export const Book = mongoose.model<IBook>('Book', BookSchema)
