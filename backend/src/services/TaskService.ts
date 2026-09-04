import { Task, ITask } from '../models/Task'
import { User } from '../models/User'
import { audit } from '../lib/audit'
import { NotFoundError, ValidationError } from '../lib/errors'
import { DEMO_TASKS } from '../lib/demo-data'
import { isDemoUser } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'

export class TaskService {
  /**
   * Fetch all tasks for a given user.
   */
  static async getTasks(userId: string) {
    if (isDemoUser(userId)) return DEMO_TASKS
    const tasks = await Task.find({ userId }).sort({ createdAt: -1 })
    return tasks
  }

  /**
   * Create a new task.
   */
  static async createTask(userId: string, rawData: Partial<ITask>) {
    const data = sanitizeBody(rawData)
    
    if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
      throw new ValidationError('Task title is required')
    }

    if (isDemoUser(userId)) {
      return { _id: `demo-${Date.now()}`, ...data, userId, status: 'todo' }
    }
    
    const task = await Task.create({ ...data, userId })
    
    audit(userId, 'create', 'tasks', task._id.toString(), {
      after: task.toJSON(),
      eventType: 'task.created',
      source: 'manual',
      metadata: { title: task.title, priority: task.priority, dueDate: task.dueDate },
    })
    
    return task
  }

  /**
   * Update an existing task. Handles XP awarding for completions.
   */
  static async updateTask(userId: string, taskId: string, rawData: Partial<ITask>) {
    const updates = sanitizeBody(rawData)
    
    if (isDemoUser(userId)) {
      const existing = DEMO_TASKS.find(t => t._id === taskId)
      return { ...(existing || {}), ...updates, _id: taskId, userId }
    }

    const before = await Task.findOne({ _id: taskId, userId })
    if (!before) {
      throw new NotFoundError('Task not found')
    }

    const task = await Task.findOneAndUpdate({ _id: taskId, userId }, updates, { new: true })
    if (!task) {
      throw new NotFoundError('Task not found')
    }

    const wasCompleted = (updates as Record<string, unknown>).status === 'done' && before.status !== 'done'
    
    audit(userId, 'update', 'tasks', taskId, {
      before: before.toJSON(),
      after: task.toJSON(),
      changes: updates as Record<string, unknown>,
      eventType: wasCompleted ? 'task.completed' : 'task.updated',
      source: 'manual',
      metadata: { title: task.title, priority: task.priority, status: task.status },
    })

    // Award XP atomically: only if we're the one transitioning to done
    if (wasCompleted) {
      const xpResult = await Task.findOneAndUpdate(
        { _id: taskId, userId, _xpAwarded: { $ne: true } },
        { $set: { _xpAwarded: true } }
      )
      if (xpResult) {
        await User.findByIdAndUpdate(userId, { $inc: { xp: 15 } })
      }
    }

    return task
  }

  /**
   * Delete a task.
   */
  static async deleteTask(userId: string, taskId: string) {
    if (isDemoUser(userId)) return true
    
    const task = await Task.findOne({ _id: taskId, userId })
    if (!task) {
      throw new NotFoundError('Task not found')
    }

    audit(userId, 'delete', 'tasks', taskId, {
      before: task.toJSON(),
      eventType: 'task.deleted',
      source: 'manual',
      metadata: { title: task.title },
    })
    
    await Task.findOneAndDelete({ _id: taskId, userId })
    return true
  }
}
