import { Project, IProject } from '../models/Project'
import { audit } from '../lib/audit'
import { NotFoundError, ValidationError } from '../lib/errors'
import { DEMO_PROJECTS } from '../lib/demo-data'
import { isDemoUser } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { isValidObjectId } from '../lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectStatus = 'active' | 'completed' | 'paused' | 'archived'
const VALID_STATUSES: ProjectStatus[] = ['active', 'completed', 'paused', 'archived']

// ─── ProjectService ───────────────────────────────────────────────────────────

export class ProjectService {
  /**
   * Fetch all projects for a user. Capped at 100.
   */
  static async getProjects(userId: string) {
    if (isDemoUser(userId)) return DEMO_PROJECTS
    return Project.find({ userId }).sort({ updatedAt: -1 }).limit(100).lean()
  }

  /**
   * Create a new project.
   */
  static async createProject(userId: string, rawData: Partial<IProject>) {
    const data = sanitizeBody(rawData)

    if (!data.name || typeof data.name !== 'string' || !String(data.name).trim()) {
      throw new ValidationError('Project name is required')
    }
    if (data.status !== undefined && !VALID_STATUSES.includes(data.status as ProjectStatus)) {
      throw new ValidationError(`Status must be one of: ${VALID_STATUSES.join(', ')}`)
    }

    if (isDemoUser(userId)) {
      return {
        _id: `demo-${Date.now()}`,
        ...data,
        userId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }

    const item = await Project.create({ ...data, userId })

    audit(userId, 'create', 'projects', item._id.toString(), {
      after: item.toJSON(),
      eventType: 'project.created',
      source: 'manual',
      metadata: { name: item.name },
    })

    return item
  }

  /**
   * Update a project.
   */
  static async updateProject(userId: string, projectId: string, rawData: Partial<IProject>) {
    if (!isValidObjectId(projectId)) throw new ValidationError('Invalid project ID')

    const updates = sanitizeBody(rawData)

    if (updates.status !== undefined && !VALID_STATUSES.includes(updates.status as ProjectStatus)) {
      throw new ValidationError(`Status must be one of: ${VALID_STATUSES.join(', ')}`)
    }

    if (isDemoUser(userId)) {
      const existing = DEMO_PROJECTS.find(p => p._id === projectId)
      return { ...(existing || {}), ...updates, _id: projectId, userId }
    }

    const before = await Project.findOne({ _id: projectId, userId })
    if (!before) throw new NotFoundError('Project not found')

    const item = await Project.findOneAndUpdate({ _id: projectId, userId }, updates, { new: true })
    if (!item) throw new NotFoundError('Project not found')

    audit(userId, 'update', 'projects', projectId, {
      before: before.toJSON(),
      after: item.toJSON(),
      changes: updates as Record<string, unknown>,
      eventType: 'project.updated',
      source: 'manual',
      metadata: { name: item.name, status: item.status },
    })

    return item
  }

  /**
   * Delete a project.
   */
  static async deleteProject(userId: string, projectId: string) {
    if (!isValidObjectId(projectId)) throw new ValidationError('Invalid project ID')
    if (isDemoUser(userId)) return true

    const item = await Project.findOne({ _id: projectId, userId })
    if (!item) throw new NotFoundError('Project not found')

    audit(userId, 'delete', 'projects', projectId, {
      before: item.toJSON(),
      eventType: 'project.deleted',
      source: 'manual',
      metadata: { name: item.name },
    })

    await Project.findOneAndDelete({ _id: projectId, userId })
    return true
  }
}
