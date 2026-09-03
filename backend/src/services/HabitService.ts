import { Habit, IHabit } from '../models/Habit'
import { User } from '../models/User'
import { audit } from '../lib/audit'
import { NotFoundError, ValidationError } from '../lib/errors'
import { DEMO_HABITS } from '../lib/demo-data'
import { isDemoUser } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'

export class HabitService {
  static async getHabits(userId: string) {
    if (isDemoUser(userId)) return DEMO_HABITS
    return await Habit.find({ userId }).sort({ order: 1 })
  }

  static async createHabit(userId: string, rawData: Partial<IHabit>) {
    const data = sanitizeBody(rawData)
    
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      throw new ValidationError('Habit name is required')
    }

    if (isDemoUser(userId)) {
      return { _id: `demo-${Date.now()}`, ...data, userId, completedDates: [] }
    }
    
    const count = await Habit.countDocuments({ userId })
    const habit = await Habit.create({ ...data, userId, order: count, completedDates: [] })
    
    audit(userId, 'create', 'habits', habit._id.toString(), {
      after: habit.toJSON(),
      eventType: 'habit.created',
      source: 'manual',
      metadata: { name: habit.name },
    })
    
    return habit
  }

  static async updateHabit(userId: string, habitId: string, rawData: Partial<IHabit>) {
    const updates = sanitizeBody(rawData)
    
    if (isDemoUser(userId)) {
      const existing = DEMO_HABITS.find(h => h._id === habitId)
      return { ...(existing || {}), ...updates, _id: habitId, userId }
    }

    const before = await Habit.findOne({ _id: habitId, userId })
    if (!before) throw new NotFoundError('Habit not found')

    const habit = await Habit.findOneAndUpdate({ _id: habitId, userId }, updates, { new: true })
    if (!habit) throw new NotFoundError('Habit not found')

    audit(userId, 'update', 'habits', habitId, {
      before: before.toJSON(),
      after: habit.toJSON(),
      changes: updates as Record<string, unknown>,
      eventType: 'habit.updated',
      source: 'manual',
      metadata: { name: habit.name },
    })
    
    return habit
  }

  static async deleteHabit(userId: string, habitId: string) {
    if (isDemoUser(userId)) return true
    
    const habit = await Habit.findOne({ _id: habitId, userId })
    if (!habit) throw new NotFoundError('Habit not found')

    audit(userId, 'delete', 'habits', habitId, {
      before: habit.toJSON(),
      eventType: 'habit.deleted',
      source: 'manual',
      metadata: { name: habit.name },
    })
    
    await Habit.findOneAndDelete({ _id: habitId, userId })
    return true
  }

  static async logCompletion(userId: string, habitId: string, date: string) {
    if (!date || typeof date !== 'string') {
      throw new ValidationError('Date is required in format YYYY-MM-DD')
    }

    if (isDemoUser(userId)) {
      const existing = DEMO_HABITS.find(h => h._id === habitId)
      if (existing && !existing.completedDates.includes(date)) {
        existing.completedDates.push(date)
      }
      return existing
    }

    const before = await Habit.findOne({ _id: habitId, userId })
    if (!before) throw new NotFoundError('Habit not found')

    const habit = await Habit.findOneAndUpdate(
      { _id: habitId, userId },
      { $addToSet: { completedDates: date } },
      { new: true }
    )
    if (!habit) throw new NotFoundError('Habit not found')

    // If it was newly added (not in before array), award XP
    if (!before.completedDates?.includes(date)) {
      await User.findByIdAndUpdate(userId, { $inc: { xp: 10 } })
      
      audit(userId, 'update', 'habits', habitId, {
        before: before.toJSON(),
        after: habit.toJSON(),
        changes: { log: date },
        eventType: 'habit.completed',
        source: 'manual',
        metadata: { name: habit.name, date },
      })
    }

    return habit
  }

  static async unlogCompletion(userId: string, habitId: string, date: string) {
    if (!date || typeof date !== 'string') {
      throw new ValidationError('Date is required in format YYYY-MM-DD')
    }

    if (isDemoUser(userId)) {
      const existing = DEMO_HABITS.find(h => h._id === habitId)
      if (existing) {
        existing.completedDates = existing.completedDates.filter(d => d !== date)
      }
      return existing
    }

    const before = await Habit.findOne({ _id: habitId, userId })
    if (!before) throw new NotFoundError('Habit not found')

    const habit = await Habit.findOneAndUpdate(
      { _id: habitId, userId },
      { $pull: { completedDates: date } },
      { new: true }
    )
    if (!habit) throw new NotFoundError('Habit not found')

    if (before.completedDates?.includes(date)) {
      await User.findByIdAndUpdate(userId, { $inc: { xp: -10 } })
      
      audit(userId, 'update', 'habits', habitId, {
        before: before.toJSON(),
        after: habit.toJSON(),
        changes: { unlog: date },
        eventType: 'habit.uncompleted',
        source: 'manual',
        metadata: { name: habit.name, date },
      })
    }

    return habit
  }
}
