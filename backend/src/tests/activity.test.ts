import request from 'supertest'
import express from 'express'
import activityRoutes from '../routes/activity'
import { AuditLog } from '../models/AuditLog'
import jwt from 'jsonwebtoken'

// Mock the AuditLog model
jest.mock('../models/AuditLog', () => ({
  AuditLog: {
    find: jest.fn(),
  },
}))

const app = express()
app.use(express.json())
app.use('/api/activity', activityRoutes)

const mockUserId = 'mock-user-123'
const token = jwt.sign({ userId: mockUserId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' })

describe('Activity / Timeline API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('filters by eventType != null and sorts descending', async () => {
    const mockFind = jest.fn().mockReturnThis()
    const mockSort = jest.fn().mockReturnThis()
    const mockSkip = jest.fn().mockReturnThis()
    const mockLimit = jest.fn().mockReturnThis()
    const mockSelect = jest.fn().mockResolvedValue([
      { eventType: 'task.completed', source: 'manual', metadata: {} }
    ])

    ;(AuditLog.find as jest.Mock).mockImplementation(() => ({
      sort: mockSort,
      skip: mockSkip,
      limit: mockLimit,
      select: mockSelect,
    }))

    const res = await request(app)
      .get('/api/activity')
      .set('Authorization', `Bearer ${token}`)
    
    expect(res.status).toBe(200)
    expect(res.body.length).toBe(1)
    
    expect(AuditLog.find).toHaveBeenCalledWith({
      userId: mockUserId,
      eventType: { $ne: null }
    })
    
    expect(mockSort).toHaveBeenCalledWith({ timestamp: -1 })
    expect(mockSkip).toHaveBeenCalledWith(0)
    expect(mockLimit).toHaveBeenCalledWith(50) // Default max
    expect(mockSelect).toHaveBeenCalledWith('eventType source metadata timestamp collectionName documentId')
  })

  it('respects limit and skip pagination', async () => {
    const mockSort = jest.fn().mockReturnThis()
    const mockSkip = jest.fn().mockReturnThis()
    const mockLimit = jest.fn().mockReturnThis()
    const mockSelect = jest.fn().mockResolvedValue([])

    ;(AuditLog.find as jest.Mock).mockImplementation(() => ({
      sort: mockSort,
      skip: mockSkip,
      limit: mockLimit,
      select: mockSelect,
    }))

    await request(app)
      .get('/api/activity?limit=10&skip=20')
      .set('Authorization', `Bearer ${token}`)
    
    expect(mockSkip).toHaveBeenCalledWith(20)
    expect(mockLimit).toHaveBeenCalledWith(10)
  })

  it('caps max limit at 200', async () => {
    const mockSort = jest.fn().mockReturnThis()
    const mockSkip = jest.fn().mockReturnThis()
    const mockLimit = jest.fn().mockReturnThis()
    const mockSelect = jest.fn().mockResolvedValue([])

    ;(AuditLog.find as jest.Mock).mockImplementation(() => ({
      sort: mockSort,
      skip: mockSkip,
      limit: mockLimit,
      select: mockSelect,
    }))

    await request(app)
      .get('/api/activity?limit=1000') // Over max
      .set('Authorization', `Bearer ${token}`)
    
    expect(mockLimit).toHaveBeenCalledWith(200) // capped
  })
})
