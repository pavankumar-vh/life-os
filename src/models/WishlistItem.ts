import mongoose, { Schema, Document } from 'mongoose'

export interface IWishlistItem extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  category: 'buy' | 'experience' | 'travel' | 'learn' | 'other'
  priority: 'low' | 'medium' | 'high'
  estimatedCost: number
  url: string
  notes: string
  completed: boolean
}

const WishlistItemSchema = new Schema<IWishlistItem>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['buy', 'experience', 'travel', 'learn', 'other'], default: 'buy' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  estimatedCost: { type: Number, default: 0 },
  url: { type: String, default: '' },
  notes: { type: String, default: '' },
  completed: { type: Boolean, default: false },
}, { timestamps: true })

export const WishlistItem = mongoose.models.WishlistItem || mongoose.model<IWishlistItem>('WishlistItem', WishlistItemSchema)
