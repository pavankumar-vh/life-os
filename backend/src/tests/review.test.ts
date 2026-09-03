import request from 'supertest'
import express from 'express'
import reviewRoutes from '../routes/review'
import { Task } from '../models/Task'
import { Habit } from '../models/Habit'
import { Workout } from '../models/Workout'
import jwt from 'jsonwebtoken'

jest.mock('../models/Task', () => ({ Task: { find: jest.fn() } }))
jest.mock('../models/Habit', () => ({ Habit: { find: jest.fn() } }))
jest.mock('../models/Workout', () => ({ Workout: { find: jest.fn() } }))
jest.mock('../models/FocusSession', () => ({ FocusSession: { find: jest.fn() } }))
jest.mock('../models/Goal', () => ({ Goal: { find: jest.fn() } }))
jest.mock('../models/Project', () => ({ Project: { find: jest.fn() } }))
jest.mock('../models/Expense', () => ({ Expense: { find: jest.fn() } }))
jest.mock('../models/Journal', () => ({ Journal: { find: jest.fn() } }))
jest.mock('../models/Capture', () => ({ Capture: { find: jest.fn() } }))

const app = express()
app.use(express.json())
app.use('/api/review', reviewRoutes)

const mockUserId = 'mock-user-123'
const token = jwt.sign({ userId: mockUserId }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' })

describe('Weekly Review API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    const { FocusSession } = require('../models/FocusSession')
    const { Goal } = require('../models/Goal')
    const { Project } = require('../models/Project')
    const { Expense } = require('../models/Expense')
    const { Journal } = require('../models/Journal')
    const { Capture } = require('../models/Capture')

    // Default mocks
    ;(Task.find as jest.Mock).mockResolvedValue([])
    ;(Habit.find as jest.Mock).mockResolvedValue([])
    ;(Workout.find as jest.Mock).mockResolvedValue([])
    ;(FocusSession.find as jest.Mock).mockResolvedValue([])
    ;(Goal.find as jest.Mock).mockResolvedValue([])
    ;(Project.find as jest.Mock).mockResolvedValue([])
    ;(Expense.find as jest.Mock).mockResolvedValue([])
    ;(Journal.find as jest.Mock).mockResolvedValue([])
    ;(Capture.find as jest.Mock).mockResolvedValue([])
  })

  it('requires start and end parameters', async () => {
    const res = await request(app)
      .get('/api/review/weekly')
      .set('Authorization', `Bearer ${token}`)
    
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/start and end dates are required/)
  })

  it('aggregates data correctly', async () => {
    const { Expense } = require('../models/Expense')
    const { Journal } = require('../models/Journal')

    ;(Task.find as jest.Mock).mockResolvedValue([
      { status: 'done', dueDate: '2026-09-02' },
      { status: 'todo', dueDate: '2020-01-01' } // overdue
    ])
    ;(Habit.find as jest.Mock).mockResolvedValue([
      { completedDates: ['2026-09-02', '2026-09-03'] }
    ])
    ;(Expense.find as jest.Mock).mockResolvedValue([
      { amount: 10 },
      { amount: 20 }
    ])
    ;(Journal.find as jest.Mock).mockResolvedValue([
      { mood: 4 },
      { mood: 5 }
    ])

    const res = await request(app)
      .get('/api/review/weekly?start=2026-09-01&end=2026-09-07')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    
    // Tasks
    expect(res.body.tasks.completed).toBe(1)
    expect(res.body.tasks.remaining).toBe(1)
    expect(res.body.tasks.overdue).toBe(1)

    // Habits
    expect(res.body.habits.completedCount).toBe(2)
    expect(res.body.habits.totalPossible).toBe(7)
    expect(res.body.habits.completionRate).toBe(Math.round((2 / 7) * 100))

    // Expenses
    expect(res.body.expenses.totalAmount).toBe(30)
    
    // Journal
    expect(res.body.journal.avgMood).toBe(4.5)

    // Check user isolation
    expect(Task.find).toHaveBeenCalledWith({
      userId: mockUserId,
      dueDate: { $gte: '2026-09-01', $lte: '2026-09-07' }
    })
  })

  it('handles empty data gracefully', async () => {
    const res = await request(app)
      .get('/api/review/weekly?start=2026-09-01&end=2026-09-07')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.tasks.completed).toBe(0)
    expect(res.body.habits.completionRate).toBe(0)
    expect(res.body.journal.avgMood).toBe(0)
  })
})
