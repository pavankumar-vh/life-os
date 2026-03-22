import mongoose, { Schema, Document } from 'mongoose'

export interface IExerciseSet {
  reps: number
  weight: number
  unit: 'kg' | 'lbs'
}

export interface IExercise {
  name: string
  sets: IExerciseSet[]
  notes: string
}

export interface IWorkout extends Document {
  userId: mongoose.Types.ObjectId
  date: string
  name: string
  exercises: IExercise[]
  duration: number
  notes: string
  createdAt: Date
}

const ExerciseSetSchema = new Schema<IExerciseSet>({
  reps: { type: Number, required: true },
  weight: { type: Number, required: true },
  unit: { type: String, enum: ['kg', 'lbs'], default: 'kg' },
}, { _id: false })

const ExerciseSchema = new Schema<IExercise>({
  name: { type: String, required: true },
  sets: [ExerciseSetSchema],
  notes: { type: String, default: '' },
}, { _id: false })

const WorkoutSchema = new Schema<IWorkout>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true },
  name: { type: String, required: true },
  exercises: [ExerciseSchema],
  duration: { type: Number, default: 0 },
  notes: { type: String, default: '' },
}, { timestamps: true })

export const Workout = mongoose.models.Workout || mongoose.model<IWorkout>('Workout', WorkoutSchema)
