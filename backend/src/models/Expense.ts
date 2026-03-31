import mongoose, { Schema, Document } from 'mongoose'

export interface IExpense extends Document {
  userId: mongoose.Types.ObjectId
  date: string
  amount: number
  category: 'food' | 'transport' | 'shopping' | 'bills' | 'health' | 'entertainment' | 'education' | 'other'
  description: string
  recurring: boolean
}

const ExpenseSchema = new Schema<IExpense>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, enum: ['food', 'transport', 'shopping', 'bills', 'health', 'entertainment', 'education', 'other'], default: 'other' },
  description: { type: String, required: true },
  recurring: { type: Boolean, default: false },
}, { timestamps: true })

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema)
