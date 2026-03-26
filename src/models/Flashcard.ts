import mongoose, { Schema, Document } from 'mongoose'

export interface IFlashcard extends Document {
  userId: mongoose.Types.ObjectId
  deck: string
  front: string
  back: string
  difficulty: 'easy' | 'medium' | 'hard'
  nextReview: string
  timesReviewed: number
  timesCorrect: number
}

const FlashcardSchema = new Schema<IFlashcard>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deck: { type: String, required: true },
  front: { type: String, required: true },
  back: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  nextReview: { type: String, required: true },
  timesReviewed: { type: Number, default: 0 },
  timesCorrect: { type: Number, default: 0 },
}, { timestamps: true })

export const Flashcard = mongoose.models.Flashcard || mongoose.model<IFlashcard>('Flashcard', FlashcardSchema)
