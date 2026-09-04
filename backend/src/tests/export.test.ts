// Prevent lib/auth.ts module-level process.exit(1) — mock before any imports.
// authMiddleware stub injects req.user so protected route logic works without JWT_SECRET.
const mockUserId = 'mock-user-123'
jest.mock('../lib/auth', () => ({
  authMiddleware: jest.fn((req: any, _res: any, next: any) => {
    req.user = { userId: 'mock-user-123', email: 'test@test.com' }
    next()
  }),
  isDemoUser: jest.fn(() => false),
  verifyToken: jest.fn(),
  signToken: jest.fn(),
}))

import request from 'supertest'
import express from 'express'
import exportRoutes from '../routes/export'
import { User } from '../models/User'
import { Task } from '../models/Task'
import { Journal } from '../models/Journal'

// Mock models
jest.mock('../models/User', () => ({ User: { findById: jest.fn() } }))
jest.mock('../models/Task', () => ({ Task: { find: jest.fn() } }))
jest.mock('../models/Journal', () => ({ Journal: { find: jest.fn() } }))
// Mocking the others isn't strictly necessary if we mock their find methods locally or ignore them if they default to empty arrays
jest.mock('../models/Goal', () => ({ Goal: { find: jest.fn() } }))
jest.mock('../models/Project', () => ({ Project: { find: jest.fn() } }))
jest.mock('../models/Habit', () => ({ Habit: { find: jest.fn() } }))
jest.mock('../models/Note', () => ({ Note: { find: jest.fn() } }))
jest.mock('../models/Workout', () => ({ Workout: { find: jest.fn() } }))
jest.mock('../models/Meal', () => ({ Meal: { find: jest.fn() } }))
jest.mock('../models/SleepLog', () => ({ SleepLog: { find: jest.fn() } }))
jest.mock('../models/WaterLog', () => ({ WaterLog: { find: jest.fn() } }))
jest.mock('../models/BodyLog', () => ({ BodyLog: { find: jest.fn() } }))
jest.mock('../models/Expense', () => ({ Expense: { find: jest.fn() } }))
jest.mock('../models/Book', () => ({ Book: { find: jest.fn() } }))
jest.mock('../models/Bookmark', () => ({ Bookmark: { find: jest.fn() } }))
jest.mock('../models/Flashcard', () => ({ Flashcard: { find: jest.fn() } }))
jest.mock('../models/Capture', () => ({ Capture: { find: jest.fn() } }))
jest.mock('../models/AuditLog', () => ({ AuditLog: { find: jest.fn() } }))

const app = express()
app.use(express.json())
app.use('/api/export', exportRoutes)

// Placeholder — authMiddleware is mocked and ignores the header value
const token = 'mock-bearer-token'


describe('Data Export API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mocks for all models used in Promise.all
    const models = [
      'Goal', 'Project', 'Habit', 'Note', 'Workout', 'Meal',
      'SleepLog', 'WaterLog', 'BodyLog', 'Expense', 'Book',
      'Bookmark', 'Flashcard', 'Capture', 'AuditLog'
    ]
    models.forEach(modelName => {
      const mockFind = jest.fn().mockReturnThis()
      const mockLean = jest.fn().mockResolvedValue([])
      const { [modelName]: model } = require(`../models/${modelName}`)
      model.find.mockImplementation(() => ({ lean: mockLean }))
    })

    const mockTaskFind = jest.fn().mockReturnThis()
    const mockTaskLean = jest.fn().mockResolvedValue([{ title: 'Test Task', status: 'done', dueDate: '2026-09-01' }])
    ;(Task.find as jest.Mock).mockImplementation(() => ({ lean: mockTaskLean }))

    const mockJournalFind = jest.fn().mockReturnThis()
    const mockJournalLean = jest.fn().mockResolvedValue([{ date: '2026-09-01', mood: 4, content: 'Test journal' }])
    ;(Journal.find as jest.Mock).mockImplementation(() => ({ lean: mockJournalLean }))
  })

  it('scrubs user secrets from JSON export', async () => {
    const mockFindById = jest.fn().mockReturnThis()
    const mockLean = jest.fn().mockResolvedValue({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashed-password',
      mfaSecret: 'secret',
      mfaRecoveryCodes: ['code1'],
      googleTokens: { access_token: 'token' },
      passwordResetToken: 'reset',
      settings: {
        aiKeys: { openai: 'sk-123' },
        theme: 'dark'
      }
    })
    ;(User.findById as jest.Mock).mockImplementation(() => ({ lean: mockLean }))

    const res = await request(app)
      .get('/api/export?format=json')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.user.name).toBe('Test User')
    expect(res.body.user.password).toBeUndefined()
    expect(res.body.user.mfaSecret).toBeUndefined()
    expect(res.body.user.mfaRecoveryCodes).toBeUndefined()
    expect(res.body.user.googleTokens).toBeUndefined()
    expect(res.body.user.passwordResetToken).toBeUndefined()
    expect(res.body.user.settings.aiKeys).toBeUndefined()
    expect(res.body.user.settings.theme).toBe('dark')

    expect(res.body.data.tasks.length).toBe(1)
    expect(res.body.data.journal.length).toBe(1)

    expect(Task.find).toHaveBeenCalledWith({ userId: mockUserId })
  })

  it('exports in markdown format correctly', async () => {
    const mockFindById = jest.fn().mockReturnThis()
    const mockLean = jest.fn().mockResolvedValue({
      name: 'Test User',
      email: 'test@example.com'
    })
    ;(User.findById as jest.Mock).mockImplementation(() => ({ lean: mockLean }))

    const res = await request(app)
      .get('/api/export?format=md')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/markdown/)
    
    const text = res.text
    expect(text).toContain('# Life OS Export')
    expect(text).toContain('User: Test User (test@example.com)')
    expect(text).toContain('## Tasks')
    expect(text).toContain('- **Test Task** (Status: done)')
    expect(text).toContain('## Journal')
    expect(text).toContain('### 2026-09-01')
  })
})
