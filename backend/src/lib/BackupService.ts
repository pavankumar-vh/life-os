import crypto from 'crypto'
import { google } from 'googleapis'
import { User } from '../models/User'
import { Task } from '../models/Task'
import { Goal } from '../models/Goal'
import { Project } from '../models/Project'
import { Habit } from '../models/Habit'
import { Note } from '../models/Note'
import { Journal } from '../models/Journal'
import { Workout } from '../models/Workout'
import { Meal } from '../models/Meal'
import { SleepLog } from '../models/SleepLog'
import { WaterLog } from '../models/WaterLog'
import { BodyLog } from '../models/BodyLog'
import { Expense } from '../models/Expense'
import { Book } from '../models/Book'
import { Bookmark } from '../models/Bookmark'
import { Flashcard } from '../models/Flashcard'
import { Capture } from '../models/Capture'
import { AuditLog } from '../models/AuditLog'
import { Gratitude } from '../models/Gratitude'
import { WishlistItem } from '../models/WishlistItem'
import { FocusSession } from '../models/FocusSession'
import { isEncrypted, decrypt } from './crypto'
import { audit } from './audit'

// ─── Constants ────────────────────────────────────────────────────────────────

export const BACKUP_FORMAT_VERSION = '2.0'
export const APP_VERSION = process.env.npm_package_version || '0.1.0'
export const DRIVE_FOLDER_NAME = 'LifeOS Backups'

// Fields to NEVER include in a backup
const USER_SECRET_FIELDS = [
  'password',
  'passwordResetToken',
  'passwordResetExpires',
  'mfaSecret',
  'mfaPendingSecret',
  'mfaRecoveryCodes',
  'googleTokens',
]

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface BackupManifest {
  formatVersion: string
  appVersion: string
  createdAt: string
  userId: string
  userEmail: string
  userName: string
  checksum: string
  collections: Record<string, number>
  totalRecords: number
}

export interface LifeOSBackup {
  manifest: BackupManifest
  data: Record<string, unknown[]>
  safeUserSettings: Record<string, unknown>
}

export type BackupStatus = 'success' | 'failed' | 'partial'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute a SHA-256 checksum of the data payload for integrity verification.
 * Uses a recursive key-sorting replacer to guarantee deterministic output
 * regardless of key insertion order in either JS objects or DB results.
 */
export function computeChecksum(data: Record<string, unknown>): string {
  // Replacer that sorts object keys at every depth
  function sortedReplacer(_key: string, value: unknown): unknown {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value as Record<string, unknown>)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = (value as Record<string, unknown>)[k]
          return acc
        }, {})
    }
    return value
  }

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(data, sortedReplacer))
    .digest('hex')
}

/**
 * Verify the checksum of a backup's data payload against its manifest.
 */
export function verifyChecksum(backup: LifeOSBackup): boolean {
  try {
    const expected = backup.manifest.checksum
    const actual = computeChecksum(backup.data)
    return expected === actual
  } catch {
    return false
  }
}

/**
 * Scrub all secret fields from a user object before including in backup.
 */
export function scrubUserForBackup(user: Record<string, unknown>): Record<string, unknown> {
  const safe = { ...user }
  for (const field of USER_SECRET_FIELDS) {
    delete safe[field]
  }
  // Also scrub AI keys from settings
  if (safe.settings && typeof safe.settings === 'object') {
    const settings = { ...(safe.settings as Record<string, unknown>) }
    delete settings.aiKeys
    safe.settings = settings
  }
  return safe
}

/**
 * Get or create the LifeOS Backups folder in the user's Google Drive.
 */
export async function getDriveFolderId(drive: ReturnType<typeof google.drive>): Promise<string> {
  const folderSearch = await drive.files.list({
    q: `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  })

  if (folderSearch.data.files?.length) {
    return folderSearch.data.files[0].id!
  }

  const folder = await drive.files.create({
    requestBody: {
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  })
  return folder.data.id!
}

/**
 * Get an authenticated Drive client for a user.
 */
export async function getUserDriveClient(userId: string) {
  const user = await User.findById(userId).select('googleTokens')
  if (!user?.googleTokens?.access_token && !user?.googleTokens?.refresh_token) {
    throw new Error('Google not connected')
  }

  const rawAccess = user.googleTokens.access_token as unknown
  const rawRefresh = user.googleTokens.refresh_token as unknown
  const accessToken = rawAccess
    ? (isEncrypted(rawAccess) ? decrypt(rawAccess) : String(rawAccess))
    : undefined
  const refreshToken = rawRefresh
    ? (isEncrypted(rawRefresh) ? decrypt(rawRefresh) : String(rawRefresh))
    : undefined

  const { getAuthedClient } = await import('./google')
  const client = getAuthedClient({ access_token: accessToken, refresh_token: refreshToken })

  // Listen for token refresh and persist
  client.on('tokens', async (tokens) => {
    const { encrypt } = await import('./crypto')
    const update: Record<string, unknown> = {}
    if (tokens.access_token) update['googleTokens.access_token'] = encrypt(tokens.access_token)
    if (tokens.refresh_token) update['googleTokens.refresh_token'] = encrypt(tokens.refresh_token)
    if (tokens.expiry_date) update['googleTokens.expiry_date'] = tokens.expiry_date
    if (Object.keys(update).length) {
      await User.findByIdAndUpdate(userId, { $set: update })
    }
  })

  return google.drive({ version: 'v3', auth: client })
}

// ─── Core Backup ──────────────────────────────────────────────────────────────

/**
 * Gathers all user-owned data from the database.
 * NEVER includes secrets. Suitable for Drive upload or local export.
 */
export async function gatherUserData(userId: string): Promise<{ data: Record<string, unknown[]>, safeUser: Record<string, unknown> }> {
  const q = { userId }

  const [
    rawUser,
    tasks, goals, projects, habits, notes, journal,
    workouts, meals, sleep, water, body, expenses,
    books, bookmarks, flashcards, captures, activity,
    gratitude, wishlist, focus
  ] = await Promise.all([
    User.findById(userId).lean(),
    Task.find(q).lean(),
    Goal.find(q).lean(),
    Project.find(q).lean(),
    Habit.find(q).lean(),
    Note.find(q).lean(),
    Journal.find(q).lean(),
    Workout.find(q).lean(),
    Meal.find(q).lean(),
    SleepLog.find(q).lean(),
    WaterLog.find(q).lean(),
    BodyLog.find(q).lean(),
    Expense.find(q).lean(),
    Book.find(q).lean(),
    Bookmark.find(q).lean(),
    Flashcard.find(q).lean(),
    Capture.find(q).lean(),
    AuditLog.find(q).sort({ createdAt: -1 }).limit(500).lean(), // limit activity log
    Gratitude.find(q).lean(),
    WishlistItem.find(q).lean(),
    FocusSession.find(q).lean(),
  ])

  const safeUser = scrubUserForBackup(rawUser as Record<string, unknown>)

  const data: Record<string, unknown[]> = {
    tasks, goals, projects, habits, notes, journal,
    workouts, meals, sleep, water, body, expenses,
    books, bookmarks, flashcards, captures, activity,
    gratitude, wishlist, focus
  }

  return { data, safeUser }
}

/**
 * Build a complete, versioned LifeOS backup object with manifest and checksum.
 */
export async function buildBackup(userId: string): Promise<LifeOSBackup> {
  const { data, safeUser } = await gatherUserData(userId)

  const checksum = computeChecksum(data)
  const collections: Record<string, number> = {}
  let totalRecords = 0

  for (const [key, records] of Object.entries(data)) {
    collections[key] = records.length
    totalRecords += records.length
  }

  const manifest: BackupManifest = {
    formatVersion: BACKUP_FORMAT_VERSION,
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
    userId,
    userEmail: (safeUser.email as string) || '',
    userName: (safeUser.name as string) || '',
    checksum,
    collections,
    totalRecords,
  }

  return { manifest, data, safeUserSettings: safeUser.settings as Record<string, unknown> || {} }
}

/**
 * Generate the standard backup filename.
 * Format: LifeOS_2026-09-04T020000Z_v2.0.json
 */
export function generateBackupFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + 'Z'
  return `LifeOS_${timestamp}_v${BACKUP_FORMAT_VERSION}.json`
}

// ─── Drive Operations ─────────────────────────────────────────────────────────

/**
 * Upload a backup to Google Drive. Returns the file ID and metadata.
 * Throws on any failure — caller must handle status.
 */
export async function uploadBackupToDrive(
  drive: ReturnType<typeof google.drive>,
  backup: LifeOSBackup,
  fileName: string,
  folderId: string
): Promise<{ id: string; name: string; link: string; size: string }> {
  const content = JSON.stringify(backup, null, 2)

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/json',
    },
    media: {
      mimeType: 'application/json',
      body: content,
    },
    fields: 'id,name,webViewLink,size',
  })

  if (!file.data.id) {
    throw new Error('Drive upload did not return a file ID')
  }

  return {
    id: file.data.id,
    name: file.data.name || fileName,
    link: file.data.webViewLink || '',
    size: file.data.size || '0',
  }
}

/**
 * Download and parse a backup file from Google Drive.
 * Validates that it looks like a LifeOS backup before returning.
 */
export async function downloadBackupFromDrive(
  drive: ReturnType<typeof google.drive>,
  fileId: string
): Promise<LifeOSBackup> {
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'text' }
  )

  let parsed: unknown
  try {
    parsed = JSON.parse(response.data as string)
  } catch {
    throw new Error('Backup file is not valid JSON')
  }

  const backup = parsed as LifeOSBackup
  if (!backup?.manifest?.formatVersion || !backup?.data || !backup?.manifest?.checksum) {
    throw new Error('Backup is missing required manifest fields')
  }

  return backup
}

// ─── Retention Policy ─────────────────────────────────────────────────────────

/**
 * Apply retention policy to existing backups in Drive.
 * Keeps the last N daily backups and 1 per week for M additional weeks.
 * Deletes anything older. Returns the count of files deleted.
 */
export async function applyRetentionPolicy(
  drive: ReturnType<typeof google.drive>,
  folderId: string,
  retainDaily = parseInt(process.env.BACKUP_RETAIN_DAILY || '7'),
  retainWeekly = parseInt(process.env.BACKUP_RETAIN_WEEKLY || '4')
): Promise<number> {
  const files = await drive.files.list({
    q: `'${folderId}' in parents and name contains 'LifeOS_' and trashed=false`,
    fields: 'files(id,name,createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 100,
  })

  const allFiles = files.data.files || []
  // Skip safety checkpoint files — never auto-delete them
  const backupFiles = allFiles.filter(f => f.name && !f.name.includes('safety_checkpoint'))

  if (backupFiles.length <= retainDaily) return 0

  // Always keep the most recent N
  const toKeep = new Set(backupFiles.slice(0, retainDaily).map(f => f.id!))

  // Keep 1 per week for the next M weeks
  const weeksSeen = new Set<number>()
  for (const file of backupFiles.slice(retainDaily)) {
    const created = new Date(file.createdTime!).getTime()
    const weekNumber = Math.floor(created / (7 * 24 * 60 * 60 * 1000))
    if (weeksSeen.size < retainWeekly && !weeksSeen.has(weekNumber)) {
      weeksSeen.add(weekNumber)
      toKeep.add(file.id!)
    }
  }

  // Delete anything not in the keep set
  const toDelete = backupFiles.filter(f => !toKeep.has(f.id!))
  let deleted = 0
  for (const file of toDelete) {
    try {
      await drive.files.delete({ fileId: file.id! })
      deleted++
    } catch (e) {
      console.error(`[BackupService] Failed to delete old backup ${file.name}:`, e)
    }
  }

  return deleted
}

// ─── Full Backup Orchestration ─────────────────────────────────────────────────

/**
 * Run a complete backup for a user: build → upload → apply retention → update user status.
 * Returns the result including status.
 */
export async function runBackupForUser(userId: string, source: 'manual' | 'scheduled' = 'manual'): Promise<{
  status: BackupStatus
  fileName?: string
  fileId?: string
  fileLink?: string
  totalRecords?: number
  error?: string
}> {
  try {
    const drive = await getUserDriveClient(userId)
    const folderId = await getDriveFolderId(drive)

    const backup = await buildBackup(userId)
    const fileName = generateBackupFilename()

    const uploaded = await uploadBackupToDrive(drive, backup, fileName, folderId)

    // Verify the upload is accessible
    if (!uploaded.id) {
      throw new Error('Upload verification failed: no file ID returned')
    }

    // Apply retention policy asynchronously (non-blocking, failures don't affect backup status)
    applyRetentionPolicy(drive, folderId).catch(e =>
      console.error('[BackupService] Retention policy error (non-fatal):', e)
    )

    // Update user backup status
    await User.findByIdAndUpdate(userId, {
      $set: {
        'settings.lastBackup': new Date().toISOString(),
        'settings.lastAutoBackup': new Date().toISOString(),
        'settings.lastBackupStatus': 'success',
      }
    })

    audit(userId, 'create', 'backup', uploaded.id, {
      after: { fileName, source, totalRecords: backup.manifest.totalRecords },
      eventType: 'backup.created',
      source,
      metadata: { fileName, totalRecords: backup.manifest.totalRecords, fileId: uploaded.id }
    })

    console.log(`[BackupService] ${source} backup completed for user ${userId}: ${fileName} (${backup.manifest.totalRecords} records)`)

    return {
      status: 'success',
      fileName,
      fileId: uploaded.id,
      fileLink: uploaded.link,
      totalRecords: backup.manifest.totalRecords,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[BackupService] Backup failed for user ${userId}:`, error)

    // Update user backup status to failed
    await User.findByIdAndUpdate(userId, {
      $set: {
        'settings.lastBackupStatus': 'failed',
      }
    }).catch(() => { /* non-fatal */ })

    return { status: 'failed', error: message }
  }
}
