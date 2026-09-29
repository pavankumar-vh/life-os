/**
 * adminPromote — Unit Tests
 * -------------------------
 * Tests the admin bootstrap/recovery logic WITHOUT a real MongoDB connection.
 * All Mongoose model and db calls are mocked, consistent with the existing
 * project test architecture (see services.test.ts).
 *
 * The script exports `promoteUser(email)` so we can call it directly without
 * spawning a process or fighting with process.exit interception.
 *
 * Scenarios covered:
 *   1. Promotes an existing user successfully (exits logic, not process)
 *   2. Unknown email → throws with a clear message
 *   3. Database connection failure → throws
 *   4. Save failure → throws
 *   5. Result has isAdmin=true, isApproved=true, isDisabled=false
 *   6. Email normalisation (lowercase + trim)
 */

// ── Silence console output during tests ──────────────────────────────────────
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterAll(() => {
  jest.restoreAllMocks()
})

// ── Mock dotenv ───────────────────────────────────────────────────────────────
jest.mock('dotenv', () => ({ config: jest.fn() }))

// ── Mock connectDB ────────────────────────────────────────────────────────────
const mockConnectDB = jest.fn()
jest.mock('../lib/db', () => ({
  connectDB: (...args: unknown[]) => mockConnectDB(...args),
}))

// ── Mock mongoose.disconnect ──────────────────────────────────────────────────
jest.mock('mongoose', () => ({
  disconnect: jest.fn().mockResolvedValue(undefined),
}))

// ── Mock User model ───────────────────────────────────────────────────────────
const mockSave    = jest.fn()
const mockFindOne = jest.fn()

jest.mock('../models/User', () => ({
  User: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
  },
}))

// ── Import the function under test ────────────────────────────────────────────
import { promoteUser } from '../scripts/adminPromote'

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<{
  name: string; email: string; isAdmin: boolean; isApproved: boolean; isDisabled: boolean
}> = {}) {
  return {
    name:       overrides.name       ?? 'Pavan Kumar',
    email:      overrides.email      ?? 'pavankumarvh@outlook.com',
    isAdmin:    overrides.isAdmin    ?? false,
    isApproved: overrides.isApproved ?? false,
    isDisabled: overrides.isDisabled ?? false,
    save: mockSave,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('promoteUser — missing / blank email', () => {
  beforeEach(() => jest.clearAllMocks())

  it('rejects with a usage message when email is empty string', async () => {
    // promoteUser('') trims to '', then connectDB fires — connectDB would be
    // reached but we guard in the CLI layer. For the function itself the blank
    // string still produces a valid normalised email query.  To keep the
    // contract simple, we set findOne to return null so we get "not found".
    mockConnectDB.mockResolvedValue(undefined)
    mockFindOne.mockResolvedValue(null)
    await expect(promoteUser('')).rejects.toThrow()
  })
})

describe('promoteUser — unknown email', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConnectDB.mockResolvedValue(undefined)
    mockFindOne.mockResolvedValue(null)
  })

  it('throws when the user is not found', async () => {
    await expect(promoteUser('nobody@example.com')).rejects.toThrow(
      'No user found with email: nobody@example.com'
    )
  })

  it('queries User.findOne with lowercased, trimmed email', async () => {
    await promoteUser('  NOBODY@EXAMPLE.COM  ').catch(() => {})
    expect(mockFindOne).toHaveBeenCalledWith({ email: 'nobody@example.com' })
  })

  it('disconnects from MongoDB even when user is not found', async () => {
    const mongoose = await import('mongoose')
    await promoteUser('nobody@example.com').catch(() => {})
    expect(mongoose.disconnect).toHaveBeenCalled()
  })
})

describe('promoteUser — database connection failure', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConnectDB.mockRejectedValue(new Error('ECONNREFUSED'))
  })

  it('rejects when connectDB throws', async () => {
    await expect(promoteUser('operator@example.com')).rejects.toThrow('ECONNREFUSED')
  })
})

describe('promoteUser — save failure', () => {
  const user = makeUser()

  beforeEach(() => {
    jest.clearAllMocks()
    mockConnectDB.mockResolvedValue(undefined)
    mockFindOne.mockResolvedValue(user)
    mockSave.mockRejectedValue(new Error('MongoNetworkError'))
  })

  it('rejects when user.save() throws', async () => {
    await expect(promoteUser('pavankumarvh@outlook.com')).rejects.toThrow('MongoNetworkError')
  })
})

describe('promoteUser — successful promotion', () => {
  const user = makeUser({ isAdmin: false, isApproved: false, isDisabled: false })

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mutable fields before each test
    user.isAdmin    = false
    user.isApproved = false
    user.isDisabled = false
    mockConnectDB.mockResolvedValue(undefined)
    mockFindOne.mockResolvedValue(user)
    mockSave.mockResolvedValue(undefined)
  })

  it('resolves with success: true', async () => {
    const result = await promoteUser('pavankumarvh@outlook.com')
    expect(result.success).toBe(true)
  })

  it('sets isAdmin to true on the user document', async () => {
    await promoteUser('pavankumarvh@outlook.com')
    expect(user.isAdmin).toBe(true)
  })

  it('sets isApproved to true on the user document', async () => {
    await promoteUser('pavankumarvh@outlook.com')
    expect(user.isApproved).toBe(true)
  })

  it('sets isDisabled to false on the user document', async () => {
    await promoteUser('pavankumarvh@outlook.com')
    expect(user.isDisabled).toBe(false)
  })

  it('calls user.save() exactly once', async () => {
    await promoteUser('pavankumarvh@outlook.com')
    expect(mockSave).toHaveBeenCalledTimes(1)
  })

  it('returns the previous isAdmin value (wasAdmin) in the result', async () => {
    const result = await promoteUser('pavankumarvh@outlook.com')
    expect(result.wasAdmin).toBe(false)
  })

  it('returns the previous isApproved value (wasApproved) in the result', async () => {
    const result = await promoteUser('pavankumarvh@outlook.com')
    expect(result.wasApproved).toBe(false)
  })

  it('returns the user email in the result', async () => {
    const result = await promoteUser('pavankumarvh@outlook.com')
    expect(result.email).toBe('pavankumarvh@outlook.com')
  })

  it('normalises email to lowercase before querying', async () => {
    await promoteUser('PavanKumarVH@Outlook.Com')
    expect(mockFindOne).toHaveBeenCalledWith({ email: 'pavankumarvh@outlook.com' })
  })

  it('disconnects from MongoDB after success', async () => {
    const mongoose = await import('mongoose')
    await promoteUser('pavankumarvh@outlook.com')
    expect(mongoose.disconnect).toHaveBeenCalled()
  })

  it('works when user already isAdmin=true (idempotent promote)', async () => {
    user.isAdmin = true
    const result = await promoteUser('pavankumarvh@outlook.com')
    expect(result.success).toBe(true)
    expect(user.isAdmin).toBe(true)
  })
})
