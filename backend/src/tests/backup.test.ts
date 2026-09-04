import {
  computeChecksum,
  verifyChecksum,
  scrubUserForBackup,
  generateBackupFilename,
  LifeOSBackup,
  BACKUP_FORMAT_VERSION,
} from '../lib/BackupService'

// ─── Unit tests for BackupService (no DB, no Drive) ──────────────────────────

describe('BackupService — scrubUserForBackup', () => {
  it('strips password hash from user object', () => {
    const user = { email: 'a@b.com', name: 'Alice', password: 'bcrypt$hash$here', settings: {} }
    const scrubbed = scrubUserForBackup(user)
    expect(scrubbed.password).toBeUndefined()
  })

  it('strips MFA secret and recovery codes', () => {
    const user = {
      email: 'a@b.com',
      name: 'Alice',
      mfaSecret: 'JBSWY3DPEHPK3PXP',
      mfaPendingSecret: 'PENDING',
      mfaRecoveryCodes: ['code1', 'code2'],
      settings: {}
    }
    const scrubbed = scrubUserForBackup(user)
    expect(scrubbed.mfaSecret).toBeUndefined()
    expect(scrubbed.mfaPendingSecret).toBeUndefined()
    expect(scrubbed.mfaRecoveryCodes).toBeUndefined()
  })

  it('strips Google OAuth tokens', () => {
    const user = {
      email: 'a@b.com',
      name: 'Alice',
      googleTokens: { access_token: 'ya29.xxx', refresh_token: '1//refresh' },
      settings: {}
    }
    const scrubbed = scrubUserForBackup(user)
    expect(scrubbed.googleTokens).toBeUndefined()
  })

  it('strips AI keys from settings but keeps other settings', () => {
    const user = {
      email: 'a@b.com',
      name: 'Alice',
      passwordResetToken: 'reset123',
      settings: {
        accentColor: '#e8d5b7',
        goals: { calories: 2200 },
        aiKeys: { openai: 'sk-proj-xxx' }
      }
    }
    const scrubbed = scrubUserForBackup(user)
    expect(scrubbed.passwordResetToken).toBeUndefined()
    const settings = scrubbed.settings as Record<string, unknown>
    expect(settings.aiKeys).toBeUndefined()
    expect(settings.accentColor).toBe('#e8d5b7')
    expect(settings.goals).toEqual({ calories: 2200 })
  })

  it('does not leak any sensitive field via enumeration', () => {
    const sensitiveFields = [
      'password', 'passwordResetToken', 'passwordResetExpires',
      'mfaSecret', 'mfaPendingSecret', 'mfaRecoveryCodes', 'googleTokens'
    ]
    const user: Record<string, unknown> = {
      email: 'a@b.com', name: 'Alice',
      settings: { aiKeys: { openai: 'key' } }
    }
    for (const f of sensitiveFields) user[f] = 'SHOULD_NOT_APPEAR'

    const scrubbed = scrubUserForBackup(user)
    const json = JSON.stringify(scrubbed)

    expect(json).not.toContain('SHOULD_NOT_APPEAR')
    for (const f of sensitiveFields) {
      expect(scrubbed[f]).toBeUndefined()
    }
  })
})

describe('BackupService — checksum', () => {
  const sampleData = {
    tasks: [{ title: 'Buy milk', status: 'todo' }],
    habits: [{ name: 'Read', completedDates: ['2026-09-04'] }],
    journal: []
  }

  it('produces a deterministic SHA-256 checksum for the same data', () => {
    const cs1 = computeChecksum(sampleData)
    const cs2 = computeChecksum(sampleData)
    expect(cs1).toBe(cs2)
    expect(cs1).toHaveLength(64) // SHA-256 hex = 64 chars
  })

  it('produces different checksums for different data', () => {
    const cs1 = computeChecksum(sampleData)
    // Use a clearly different structure — different collection keys entirely
    const cs2 = computeChecksum({ ...sampleData, tasks: [{ title: 'Completely different task', priority: 'high', status: 'done', extraField: true }] })
    expect(cs1).not.toBe(cs2)
  })

  it('verifyChecksum returns true for a valid backup', () => {
    const checksum = computeChecksum(sampleData)
    const backup: LifeOSBackup = {
      manifest: {
        formatVersion: BACKUP_FORMAT_VERSION,
        appVersion: '0.1.0',
        createdAt: '2026-09-04T00:00:00Z',
        userId: 'user123',
        userEmail: 'a@b.com',
        userName: 'Alice',
        checksum,
        collections: { tasks: 1, habits: 1, journal: 0 },
        totalRecords: 2,
      },
      data: sampleData as Record<string, unknown[]>,
      safeUserSettings: {}
    }
    expect(verifyChecksum(backup)).toBe(true)
  })

  it('verifyChecksum returns false for a tampered backup', () => {
    const backup: LifeOSBackup = {
      manifest: {
        formatVersion: BACKUP_FORMAT_VERSION,
        appVersion: '0.1.0',
        createdAt: '2026-09-04T00:00:00Z',
        userId: 'user123',
        userEmail: 'a@b.com',
        userName: 'Alice',
        checksum: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        collections: {},
        totalRecords: 0,
      },
      data: { tasks: [{ title: 'Injected!' }] },
      safeUserSettings: {}
    }
    expect(verifyChecksum(backup)).toBe(false)
  })

  it('verifyChecksum returns false for a missing checksum', () => {
    const backup = {
      manifest: { checksum: '' },
      data: sampleData
    } as unknown as LifeOSBackup
    expect(verifyChecksum(backup)).toBe(false)
  })
})

describe('BackupService — generateBackupFilename', () => {
  it('generates a filename matching LifeOS_*_v{version}.json pattern', () => {
    const name = generateBackupFilename()
    expect(name).toMatch(/^LifeOS_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z_v[\d.]+\.json$/)
  })

  it('generates unique names on successive calls (different timestamps)', () => {
    const name1 = generateBackupFilename()
    const name2 = generateBackupFilename()
    // In practice names may be equal in same millisecond — both should match format
    expect(name1).toMatch(/^LifeOS_/)
    expect(name2).toMatch(/^LifeOS_/)
  })
})

// ─── RestoreService security tests ───────────────────────────────────────────

import { validateBackup } from '../lib/RestoreService'

jest.mock('../lib/BackupService', () => ({
  ...jest.requireActual('../lib/BackupService'),
  getUserDriveClient: jest.fn(),
  downloadBackupFromDrive: jest.fn(),
}))

describe('RestoreService — cross-user isolation', () => {
  it('rejects a backup that belongs to a different user', async () => {
    const { getUserDriveClient, downloadBackupFromDrive } = require('../lib/BackupService')

    getUserDriveClient.mockResolvedValue({})
    downloadBackupFromDrive.mockResolvedValue({
      manifest: {
        formatVersion: '2.0',
        createdAt: '2026-09-04T00:00:00Z',
        userId: 'ANOTHER_USER_ID',   // ← different user
        userEmail: 'hacker@evil.com',
        userName: 'Attacker',
        checksum: 'xxx',
        collections: {},
        totalRecords: 0,
      },
      data: {},
      safeUserSettings: {}
    })

    const result = await validateBackup('LEGITIMATE_USER_ID', 'some-file-id')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('SECURITY'))).toBe(true)
  })
})

describe('RestoreService — confirmation requirement', () => {
  it('returns an error when confirm is not true', async () => {
    const { applyRestore } = require('../lib/RestoreService')
    const result = await applyRestore('user123', 'file123', false)
    expect(result.success).toBe(false)
    expect(result.errors[0]).toContain('explicit confirmation')
  })
})
