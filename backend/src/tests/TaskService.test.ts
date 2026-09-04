import { TaskService } from '../services/TaskService'
import { Task } from '../models/Task'
import { NotFoundError, ValidationError } from '../lib/errors'

jest.mock('../models/Task', () => ({
  Task: {
    find: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn()
  }
}))
jest.mock('../models/User', () => ({ User: { findByIdAndUpdate: jest.fn() } }))
jest.mock('../lib/audit', () => ({ audit: jest.fn() }))

describe('TaskService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createTask', () => {
    it('validates missing title', async () => {
      await expect(TaskService.createTask('user1', { title: '' })).rejects.toThrow(ValidationError)
    })

    it('creates a task with strictly scoped userId', async () => {
      const mockTask = { _id: 't1', title: 'Test Task', toJSON: () => ({}) }
      ;(Task.create as jest.Mock).mockResolvedValue(mockTask)

      await TaskService.createTask('user1', { title: 'Test Task' })

      expect(Task.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test Task',
        userId: 'user1'
      }))
    })
  })

  describe('updateTask', () => {
    it('throws NotFoundError if task belongs to another user (isolation test)', async () => {
      ;(Task.findOne as jest.Mock).mockResolvedValue(null) // Mock returning null because userId doesn't match

      await expect(TaskService.updateTask('hacker123', 't1', { title: 'Hacked' })).rejects.toThrow(NotFoundError)
      
      expect(Task.findOne).toHaveBeenCalledWith({
        _id: 't1',
        userId: 'hacker123'
      })
    })

    it('updates task when ownership is valid', async () => {
      const mockTask = { _id: 't1', title: 'New Title', status: 'todo', toJSON: () => ({}) }
      ;(Task.findOne as jest.Mock).mockResolvedValue(mockTask)
      ;(Task.findOneAndUpdate as jest.Mock).mockResolvedValue(mockTask)

      await TaskService.updateTask('owner123', 't1', { title: 'New Title' })

      expect(Task.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 't1', userId: 'owner123' },
        expect.objectContaining({ title: 'New Title' }),
        { new: true }
      )
    })
  })
})
