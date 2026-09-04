/**
 * Service Authorization & Validation Tests
 * -----------------------------------------
 * Tests the new GoalService, CaptureService, WorkoutService, ProjectService,
 * and JournalService for:
 *   - User isolation (cross-user access rejected)
 *   - Input validation (required fields, enums, date formats, numbers)
 *   - Correct userId propagation to DB calls
 *
 * Runs WITHOUT a real MongoDB connection — all DB calls are mocked.
 */

// Prevent lib/auth.ts module-level process.exit(1) from firing when JWT_SECRET is not set
jest.mock('../lib/auth', () => ({
  verifyToken: jest.fn(),
  signToken: jest.fn(),
  authMiddleware: jest.fn(),
  isDemoUser: jest.fn(() => false),
}))

import { GoalService } from '../services/GoalService'
import { CaptureService } from '../services/CaptureService'
import { WorkoutService } from '../services/WorkoutService'
import { ProjectService } from '../services/ProjectService'
import { JournalService } from '../services/JournalService'
import { NotFoundError, ValidationError } from '../lib/errors'
import { isValidObjectId, isValidDate } from '../lib/utils'

// ── Mongoose model mocks ──────────────────────────────────────────────────────

jest.mock('../models/Goal', () => ({
  Goal: {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) }),
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  }
}))
jest.mock('../models/Capture', () => ({
  Capture: {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ skip: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) }) }),
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  }
}))
jest.mock('../models/Workout', () => ({
  Workout: {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) }),
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  }
}))
jest.mock('../models/Project', () => ({
  Project: {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) }),
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  }
}))
jest.mock('../models/Journal', () => ({
  Journal: {
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }) }),
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
    findOneAndDelete: jest.fn(),
  }
}))
jest.mock('../models/User', () => ({ User: { findByIdAndUpdate: jest.fn() } }))
jest.mock('../lib/audit', () => ({ audit: jest.fn() }))

// Import mocked models for assertion
import { Goal } from '../models/Goal'
import { Capture } from '../models/Capture'
import { Workout } from '../models/Workout'
import { Project } from '../models/Project'
import { Journal } from '../models/Journal'

// ── Helpers ────────────────────────────────────────────────────────────────────

const REAL_ID = '507f1f77bcf86cd799439011'  // valid 24-char hex
const BAD_ID  = 'not-an-objectid'
const DEMO_ID = 'demo-user-001'

// ── lib/utils helpers ─────────────────────────────────────────────────────────

describe('isValidObjectId', () => {
  it('accepts a valid 24-char hex string', () => {
    expect(isValidObjectId(REAL_ID)).toBe(true)
  })
  it('rejects short strings', () => {
    expect(isValidObjectId('123')).toBe(false)
  })
  it('rejects non-hex characters', () => {
    expect(isValidObjectId('507f1f77bcf86cd79943901z')).toBe(false)
  })
  it('rejects non-strings', () => {
    expect(isValidObjectId(undefined)).toBe(false)
    expect(isValidObjectId(null)).toBe(false)
    expect(isValidObjectId(12345678901234567890123)).toBe(false)
  })
})

describe('isValidDate', () => {
  it('accepts YYYY-MM-DD', () => {
    expect(isValidDate('2026-09-04')).toBe(true)
  })
  it('rejects non-date strings', () => {
    expect(isValidDate('04-09-2026')).toBe(false)
    expect(isValidDate('yesterday')).toBe(false)
    expect(isValidDate('')).toBe(false)
  })
  it('rejects non-strings', () => {
    expect(isValidDate(undefined)).toBe(false)
    expect(isValidDate(null)).toBe(false)
  })
})

// ── GoalService ────────────────────────────────────────────────────────────────

describe('GoalService — validation', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws ValidationError when title is missing', async () => {
    await expect(GoalService.createGoal('user1', { title: '' })).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when target is negative', async () => {
    await expect(GoalService.createGoal('user1', { title: 'My goal', target: -10 })).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for invalid status', async () => {
    await expect(GoalService.createGoal('user1', { title: 'x', status: 'invalid' as never })).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when updating with bad ID', async () => {
    await expect(GoalService.updateGoal('user1', BAD_ID, { title: 'x' })).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when deleting with bad ID', async () => {
    await expect(GoalService.deleteGoal('user1', BAD_ID)).rejects.toThrow(ValidationError)
  })
})

describe('GoalService — authorization isolation', () => {
  beforeEach(() => jest.clearAllMocks())

  it('propagates userId to create query', async () => {
    const mockGoal = { _id: REAL_ID, title: 'test', toJSON: () => ({}) }
    ;(Goal.create as jest.Mock).mockResolvedValue(mockGoal)
    await GoalService.createGoal('user-owner', { title: 'My goal' })
    expect(Goal.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-owner' }))
  })

  it('returns NotFoundError when goal belongs to another user', async () => {
    ;(Goal.findOne as jest.Mock).mockResolvedValue(null) // attacker doesn't own it
    await expect(GoalService.updateGoal('hacker', REAL_ID, { title: 'x' })).rejects.toThrow(NotFoundError)
    expect(Goal.findOne).toHaveBeenCalledWith({ _id: REAL_ID, userId: 'hacker' })
  })

  it('uses userId in delete findOne check', async () => {
    ;(Goal.findOne as jest.Mock).mockResolvedValue(null)
    await expect(GoalService.deleteGoal('hacker', REAL_ID)).rejects.toThrow(NotFoundError)
    expect(Goal.findOne).toHaveBeenCalledWith({ _id: REAL_ID, userId: 'hacker' })
  })
})

// ── CaptureService ─────────────────────────────────────────────────────────────

describe('CaptureService — validation', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws ValidationError when text is missing', async () => {
    await expect(CaptureService.createCapture('user1', { text: '' })).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when text is too long', async () => {
    await expect(CaptureService.createCapture('user1', { text: 'x'.repeat(10001) })).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when updating with invalid ID', async () => {
    await expect(CaptureService.updateCapture('user1', BAD_ID, {})).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when deleting with invalid ID', async () => {
    await expect(CaptureService.deleteCapture('user1', BAD_ID)).rejects.toThrow(ValidationError)
  })

  it('defaults invalid source to manual', async () => {
    const mockCapture = { _id: REAL_ID, text: 'hi', type: 'thought', source: 'manual', tags: [], processed: false, toJSON: () => ({}) }
    ;(Capture.create as jest.Mock).mockResolvedValue(mockCapture)
    await CaptureService.createCapture('user1', { text: 'hi', source: 'evil_bot' as never })
    expect(Capture.create).toHaveBeenCalledWith(expect.objectContaining({ source: 'manual' }))
  })

  it('defaults invalid type to thought', async () => {
    const mockCapture = { _id: REAL_ID, text: 'hi', type: 'thought', source: 'manual', tags: [], processed: false, toJSON: () => ({}) }
    ;(Capture.create as jest.Mock).mockResolvedValue(mockCapture)
    await CaptureService.createCapture('user1', { text: 'hi', type: 'expense' as never })
    expect(Capture.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'thought' }))
  })

  it('limits tags to max 10', async () => {
    const mockCapture = { _id: REAL_ID, text: 'x', tags: [], toJSON: () => ({}) }
    ;(Capture.create as jest.Mock).mockResolvedValue(mockCapture)
    const tags = Array.from({ length: 15 }, (_, i) => `tag${i}`)
    await CaptureService.createCapture('user1', { text: 'test', tags: tags as never })
    const call = (Capture.create as jest.Mock).mock.calls[0][0]
    expect(call.tags.length).toBeLessThanOrEqual(10)
  })
})

describe('CaptureService — authorization isolation', () => {
  beforeEach(() => jest.clearAllMocks())

  it('propagates userId to create', async () => {
    const mockCapture = { _id: REAL_ID, text: 'hi', type: 'thought', source: 'manual', tags: [], processed: false, toJSON: () => ({}) }
    ;(Capture.create as jest.Mock).mockResolvedValue(mockCapture)
    await CaptureService.createCapture('owner123', { text: 'Hi' })
    expect(Capture.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'owner123' }))
  })

  it('throws NotFoundError for update on another user\'s capture', async () => {
    ;(Capture.findOne as jest.Mock).mockResolvedValue(null)
    await expect(CaptureService.updateCapture('hacker', REAL_ID, { processed: true })).rejects.toThrow(NotFoundError)
    expect(Capture.findOne).toHaveBeenCalledWith({ _id: REAL_ID, userId: 'hacker' })
  })
})

// ── WorkoutService ─────────────────────────────────────────────────────────────

describe('WorkoutService — validation', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws ValidationError when name is missing', async () => {
    await expect(WorkoutService.logWorkout('user1', { name: '' })).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for out-of-range duration', async () => {
    await expect(WorkoutService.logWorkout('user1', { name: 'Run', duration: -5 })).rejects.toThrow(ValidationError)
    await expect(WorkoutService.logWorkout('user1', { name: 'Run', duration: 9999 })).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for invalid date', async () => {
    await expect(WorkoutService.logWorkout('user1', { name: 'Run', date: 'not-a-date' as never })).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when updating with bad ID', async () => {
    await expect(WorkoutService.updateWorkout('user1', BAD_ID, {})).rejects.toThrow(ValidationError)
  })
})

describe('WorkoutService — authorization isolation', () => {
  beforeEach(() => jest.clearAllMocks())

  it('propagates userId to create', async () => {
    const mockWorkout = { _id: REAL_ID, name: 'Run', toJSON: () => ({}) }
    ;(Workout.create as jest.Mock).mockResolvedValue(mockWorkout)
    await WorkoutService.logWorkout('trainer-1', { name: 'Run', duration: 30 })
    expect(Workout.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'trainer-1' }))
  })

  it('throws NotFoundError when workout belongs to another user', async () => {
    ;(Workout.findOne as jest.Mock).mockResolvedValue(null)
    await expect(WorkoutService.deleteWorkout('hacker', REAL_ID)).rejects.toThrow(NotFoundError)
    expect(Workout.findOne).toHaveBeenCalledWith({ _id: REAL_ID, userId: 'hacker' })
  })
})

// ── ProjectService ─────────────────────────────────────────────────────────────

describe('ProjectService — validation', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws ValidationError when name is missing', async () => {
    await expect(ProjectService.createProject('user1', { name: '' })).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError for invalid status', async () => {
    await expect(ProjectService.createProject('user1', { name: 'x', status: 'flying' as never })).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when updating with bad ID', async () => {
    await expect(ProjectService.updateProject('user1', BAD_ID, {})).rejects.toThrow(ValidationError)
  })
})

describe('ProjectService — authorization isolation', () => {
  beforeEach(() => jest.clearAllMocks())

  it('propagates userId to create', async () => {
    const mockProject = { _id: REAL_ID, name: 'Proj', toJSON: () => ({}) }
    ;(Project.create as jest.Mock).mockResolvedValue(mockProject)
    await ProjectService.createProject('pm-user', { name: 'My Project' })
    expect(Project.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'pm-user' }))
  })

  it('throws NotFoundError for update on another user\'s project', async () => {
    ;(Project.findOne as jest.Mock).mockResolvedValue(null)
    await expect(ProjectService.updateProject('attacker', REAL_ID, { name: 'x' })).rejects.toThrow(NotFoundError)
    expect(Project.findOne).toHaveBeenCalledWith({ _id: REAL_ID, userId: 'attacker' })
  })
})

// ── JournalService ─────────────────────────────────────────────────────────────

describe('JournalService — validation', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws ValidationError when date is missing', async () => {
    await expect(JournalService.saveEntry('user1', { content: 'hello' } as never)).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when date has wrong format', async () => {
    await expect(JournalService.saveEntry('user1', { date: '04/09/2026' } as never)).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when mood is out of range', async () => {
    await expect(JournalService.saveEntry('user1', { date: '2026-09-04', mood: 6 } as never)).rejects.toThrow(ValidationError)
    await expect(JournalService.saveEntry('user1', { date: '2026-09-04', mood: 0 } as never)).rejects.toThrow(ValidationError)
  })

  it('throws ValidationError when deleting with bad ID', async () => {
    await expect(JournalService.deleteEntry('user1', BAD_ID)).rejects.toThrow(ValidationError)
  })
})

describe('JournalService — authorization isolation', () => {
  beforeEach(() => jest.clearAllMocks())

  it('upsert query includes userId', async () => {
    const mockEntry = { _id: REAL_ID, date: '2026-09-04', toJSON: () => ({}) }
    ;(Journal.findOneAndUpdate as jest.Mock).mockResolvedValue(mockEntry)
    await JournalService.saveEntry('writer-1', { date: '2026-09-04' } as never)
    expect(Journal.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'writer-1' }),
      expect.any(Object),
      expect.any(Object)
    )
  })

  it('throws NotFoundError when deleting another user\'s entry', async () => {
    ;(Journal.findOne as jest.Mock).mockResolvedValue(null)
    await expect(JournalService.deleteEntry('hacker', REAL_ID)).rejects.toThrow(NotFoundError)
    expect(Journal.findOne).toHaveBeenCalledWith({ _id: REAL_ID, userId: 'hacker' })
  })
})
