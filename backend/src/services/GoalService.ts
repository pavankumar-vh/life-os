import { Goal, IGoal } from '../models/Goal'
import { User } from '../models/User'
import { audit } from '../lib/audit'
import { NotFoundError, ValidationError } from '../lib/errors'
import { DEMO_GOALS } from '../lib/demo-data'
import { isDemoUser } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { isValidObjectId } from '../lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type GoalStatus = 'active' | 'completed' | 'paused'

const VALID_STATUSES: GoalStatus[] = ['active', 'completed', 'paused']

// ─── GoalService ──────────────────────────────────────────────────────────────

export class GoalService {
  /**
   * Fetch all goals for a user. Capped at 100 — more than enough for personal use.
   */
  static async getGoals(userId: string) {
    if (isDemoUser(userId)) return DEMO_GOALS
    return Goal.find({ userId }).sort({ createdAt: -1 }).limit(100).lean()
  }

  /**
   * Create a new goal.
   */
  static async createGoal(userId: string, rawData: Partial<IGoal>) {
    const data = sanitizeBody(rawData)

    // Validation
    if (!data.title || typeof data.title !== 'string' || !String(data.title).trim()) {
      throw new ValidationError('Goal title is required')
    }
    if (data.target !== undefined && (typeof data.target !== 'number' || !isFinite(data.target) || data.target < 0)) {
      throw new ValidationError('Goal target must be a non-negative number')
    }
    if (data.status !== undefined && !VALID_STATUSES.includes(data.status as GoalStatus)) {
      throw new ValidationError(`Status must be one of: ${VALID_STATUSES.join(', ')}`)
    }

    if (isDemoUser(userId)) {
      return { _id: `demo-${Date.now()}`, ...data, userId, progress: 0, status: 'active' }
    }

    const goal = await Goal.create({ ...data, userId })

    audit(userId, 'create', 'goals', goal._id.toString(), {
      after: goal.toJSON(),
      eventType: 'goal.created',
      source: 'manual',
      metadata: { title: goal.title, category: goal.category, target: goal.target, unit: goal.unit },
    })

    return goal
  }

  /**
   * Update a goal. Handles completion XP awarding atomically.
   */
  static async updateGoal(userId: string, goalId: string, rawData: Partial<IGoal>) {
    if (!isValidObjectId(goalId)) throw new ValidationError('Invalid goal ID')

    const updates = sanitizeBody(rawData)

    // Prevent status to an invalid value
    if (updates.status !== undefined && !VALID_STATUSES.includes(updates.status as GoalStatus)) {
      throw new ValidationError(`Status must be one of: ${VALID_STATUSES.join(', ')}`)
    }
    if (updates.progress !== undefined && (typeof updates.progress !== 'number' || !isFinite(updates.progress as number))) {
      throw new ValidationError('Progress must be a number')
    }

    if (isDemoUser(userId)) {
      const existing = DEMO_GOALS.find(g => g._id === goalId)
      return { ...(existing || {}), ...updates, _id: goalId, userId }
    }

    const before = await Goal.findOne({ _id: goalId, userId })
    if (!before) throw new NotFoundError('Goal not found')

    const goal = await Goal.findOneAndUpdate({ _id: goalId, userId }, updates, { new: true })
    if (!goal) throw new NotFoundError('Goal not found')

    const wasCompleted = (updates as Record<string, unknown>).status === 'completed' && before.status !== 'completed'

    audit(userId, 'update', 'goals', goalId, {
      before: before.toJSON(),
      after: goal.toJSON(),
      changes: updates as Record<string, unknown>,
      eventType: wasCompleted ? 'goal.completed' : 'goal.updated',
      source: 'manual',
      metadata: { title: goal.title, status: goal.status, progress: goal.progress },
    })

    // Award XP atomically — only on the first completion transition
    if (wasCompleted) {
      const xpResult = await Goal.findOneAndUpdate(
        { _id: goalId, userId, _xpAwarded: { $ne: true } },
        { $set: { _xpAwarded: true } }
      )
      if (xpResult) await User.findByIdAndUpdate(userId, { $inc: { xp: 50 } })
    }

    return goal
  }

  /**
   * Delete a goal.
   */
  static async deleteGoal(userId: string, goalId: string) {
    if (!isValidObjectId(goalId)) throw new ValidationError('Invalid goal ID')
    if (isDemoUser(userId)) return true

    const goal = await Goal.findOne({ _id: goalId, userId })
    if (!goal) throw new NotFoundError('Goal not found')

    audit(userId, 'delete', 'goals', goalId, {
      before: goal.toJSON(),
      eventType: 'goal.deleted',
      source: 'manual',
      metadata: { title: goal.title },
    })

    await Goal.findOneAndDelete({ _id: goalId, userId })
    return true
  }
}
