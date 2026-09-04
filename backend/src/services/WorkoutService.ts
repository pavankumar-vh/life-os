import { Workout, IWorkout } from '../models/Workout'
import { User } from '../models/User'
import { audit } from '../lib/audit'
import { NotFoundError, ValidationError } from '../lib/errors'
import { DEMO_WORKOUTS } from '../lib/demo-data'
import { isDemoUser } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { isValidObjectId, isValidDate } from '../lib/utils'

// ─── WorkoutService ───────────────────────────────────────────────────────────

export class WorkoutService {
  /**
   * Fetch workouts for a user. Capped at 100.
   */
  static async getWorkouts(userId: string) {
    if (isDemoUser(userId)) return DEMO_WORKOUTS
    return Workout.find({ userId }).sort({ date: -1 }).limit(100).lean()
  }

  /**
   * Log a new workout.
   */
  static async logWorkout(userId: string, rawData: Partial<IWorkout>) {
    const data = sanitizeBody(rawData)

    if (!data.name || typeof data.name !== 'string' || !String(data.name).trim()) {
      throw new ValidationError('Workout name is required')
    }
    if (data.duration !== undefined) {
      const dur = Number(data.duration)
      if (!isFinite(dur) || dur < 0 || dur > 1440) {
        throw new ValidationError('Duration must be a number between 0 and 1440 minutes')
      }
    }
    if (data.date !== undefined && !isValidDate(String(data.date))) {
      throw new ValidationError('Date must be in YYYY-MM-DD format')
    }

    if (isDemoUser(userId)) {
      return { _id: `demo-${Date.now()}`, ...data, userId }
    }

    const workout = await Workout.create({ ...data, userId })

    audit(userId, 'create', 'workouts', workout._id.toString(), {
      after: workout.toJSON(),
      eventType: 'workout.logged',
      source: 'manual',
      metadata: { name: workout.name, duration: workout.duration, date: workout.date },
    })

    // Award XP for logging a workout
    await User.findByIdAndUpdate(userId, { $inc: { xp: 25 } })

    return workout
  }

  /**
   * Update an existing workout.
   */
  static async updateWorkout(userId: string, workoutId: string, rawData: Partial<IWorkout>) {
    if (!isValidObjectId(workoutId)) throw new ValidationError('Invalid workout ID')

    const updates = sanitizeBody(rawData)

    if (updates.duration !== undefined) {
      const dur = Number(updates.duration)
      if (!isFinite(dur) || dur < 0 || dur > 1440) {
        throw new ValidationError('Duration must be a number between 0 and 1440 minutes')
      }
    }

    if (isDemoUser(userId)) {
      const existing = DEMO_WORKOUTS.find(w => w._id === workoutId)
      return { ...(existing || {}), ...updates, _id: workoutId, userId }
    }

    const before = await Workout.findOne({ _id: workoutId, userId })
    if (!before) throw new NotFoundError('Workout not found')

    const workout = await Workout.findOneAndUpdate({ _id: workoutId, userId }, updates, { new: true })
    if (!workout) throw new NotFoundError('Workout not found')

    audit(userId, 'update', 'workouts', workoutId, {
      before: before.toJSON(),
      after: workout.toJSON(),
      changes: updates as Record<string, unknown>,
      eventType: 'workout.updated',
      source: 'manual',
      metadata: { name: workout.name },
    })

    return workout
  }

  /**
   * Delete a workout.
   */
  static async deleteWorkout(userId: string, workoutId: string) {
    if (!isValidObjectId(workoutId)) throw new ValidationError('Invalid workout ID')
    if (isDemoUser(userId)) return true

    const workout = await Workout.findOne({ _id: workoutId, userId })
    if (!workout) throw new NotFoundError('Workout not found')

    audit(userId, 'delete', 'workouts', workoutId, {
      before: workout.toJSON(),
      eventType: 'workout.deleted',
      source: 'manual',
      metadata: { name: workout.name, date: workout.date },
    })

    await Workout.findOneAndDelete({ _id: workoutId, userId })
    return true
  }
}
