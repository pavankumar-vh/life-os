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
import { Gratitude } from '../models/Gratitude'
import { WishlistItem } from '../models/WishlistItem'
import { FocusSession } from '../models/FocusSession'
import {
  downloadBackupFromDrive,
  getUserDriveClient,
  getDriveFolderId,
  uploadBackupToDrive,
  buildBackup,
  verifyChecksum,
  LifeOSBackup,
  generateBackupFilename,
} from './BackupService'
import { audit } from './audit'
import { User } from '../models/User'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean
  errors: string[]
  manifest?: LifeOSBackup['manifest']
  collectionSummary?: Record<string, number>
  checksumValid?: boolean
}

export interface RestoreResult {
  success: boolean
  restoredCount: number
  safetyBackupId?: string
  safetyBackupName?: string
  errors: string[]
}

// ─── Validate (Step 1) ────────────────────────────────────────────────────────

/**
 * Downloads a backup from Drive and validates it WITHOUT touching the database.
 * Returns metadata so the user can review before confirming restore.
 *
 * SECURITY: Always verifies that the backup's userId matches the requesting user.
 */
export async function validateBackup(userId: string, fileId: string): Promise<ValidationResult> {
  const errors: string[] = []

  let backup: LifeOSBackup
  try {
    const drive = await getUserDriveClient(userId)
    backup = await downloadBackupFromDrive(drive, fileId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to download backup'
    return { valid: false, errors: [msg] }
  }

  // Ownership check — never allow cross-user restores
  if (backup.manifest.userId !== userId) {
    return {
      valid: false,
      errors: ['SECURITY: This backup belongs to a different user. Restore rejected.']
    }
  }

  // Checksum verification
  const checksumValid = verifyChecksum(backup)
  if (!checksumValid) {
    errors.push('WARNING: Backup checksum does not match. The backup may be corrupted or tampered with.')
  }

  // Basic structure validation
  if (!backup.manifest.formatVersion) errors.push('Missing formatVersion in manifest')
  if (!backup.manifest.createdAt) errors.push('Missing createdAt in manifest')
  if (!backup.data || typeof backup.data !== 'object') errors.push('Missing or invalid data section')

  return {
    valid: errors.filter(e => !e.startsWith('WARNING')).length === 0,
    errors,
    manifest: backup.manifest,
    collectionSummary: backup.manifest.collections,
    checksumValid,
  }
}

// ─── Restore (Step 2 — requires explicit confirmation) ────────────────────────

/**
 * Applies a backup as a safe merge-restore.
 *
 * CRITICAL SAFETY PROPERTIES:
 * - Requires `confirm: true` — caller must verify user explicitly consented
 * - Creates a safety checkpoint backup of current data BEFORE making any changes
 * - Uses upsert (merge), not delete+insert — no data is silently destroyed
 * - ALWAYS verifies userId ownership before touching any data
 * - Reports any per-collection errors without stopping the whole restore
 */
export async function applyRestore(
  userId: string,
  fileId: string,
  confirm: boolean
): Promise<RestoreResult> {
  if (!confirm) {
    return {
      success: false,
      restoredCount: 0,
      errors: ['Restore requires explicit confirmation. Set confirm: true to proceed.']
    }
  }

  const errors: string[] = []
  let restoredCount = 0

  // Step 1: Download and validate backup
  let backup: LifeOSBackup
  try {
    const drive = await getUserDriveClient(userId)
    backup = await downloadBackupFromDrive(drive, fileId)
  } catch (e) {
    return {
      success: false,
      restoredCount: 0,
      errors: [e instanceof Error ? e.message : 'Failed to download backup for restore']
    }
  }

  // Ownership check
  if (backup.manifest.userId !== userId) {
    return {
      success: false,
      restoredCount: 0,
      errors: ['SECURITY: Backup belongs to a different user. Restore rejected.']
    }
  }

  // Checksum check — warn but don't block (user already validated in step 1)
  if (!verifyChecksum(backup)) {
    errors.push('WARNING: Checksum mismatch detected. Proceeding with restore as requested.')
  }

  // Step 2: Create safety checkpoint of current data before any changes
  let safetyBackupId: string | undefined
  let safetyBackupName: string | undefined
  try {
    const drive = await getUserDriveClient(userId)
    const folderId = await getDriveFolderId(drive)
    const safetyBackup = await buildBackup(userId)
    const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + 'Z'
    const safetyFileName = `LifeOS_safety_checkpoint_${now}_v${safetyBackup.manifest.formatVersion}.json`
    const uploaded = await uploadBackupToDrive(drive, safetyBackup, safetyFileName, folderId)
    safetyBackupId = uploaded.id
    safetyBackupName = safetyFileName
    console.log(`[RestoreService] Safety checkpoint created: ${safetyFileName} (${uploaded.id})`)
  } catch (e) {
    // Safety backup failure is serious — abort restore
    return {
      success: false,
      restoredCount: 0,
      errors: [`ABORTED: Could not create safety checkpoint before restore: ${e instanceof Error ? e.message : String(e)}`]
    }
  }

  // Step 3: Apply merge-restore for each collection
  const { data } = backup
  const MAX_ITEMS = 10000

  const restoreCollection = async <T extends Record<string, unknown>>(
    model: any,
    records: T[],
    uniqueFields: (keyof T)[]
  ) => {
    if (!Array.isArray(records) || records.length === 0) return
    for (const record of records.slice(0, MAX_ITEMS)) {
      try {
        const { _id, userId: _, ...rest } = record as Record<string, unknown>
        const filter: Record<string, unknown> = { userId }
        for (const field of uniqueFields) {
          if (rest[field as string] !== undefined) {
            filter[field as string] = rest[field as string]
          }
        }
        await model.findOneAndUpdate(filter, { ...rest, userId }, { upsert: true, new: true })
        restoredCount++
      } catch (e) {
        errors.push(`Failed to restore record: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  await restoreCollection(Task, data.tasks as any[] || [], ['title'])
  await restoreCollection(Goal, data.goals as any[] || [], ['title'])
  await restoreCollection(Project, data.projects as any[] || [], ['title'])
  await restoreCollection(Habit, data.habits as any[] || [], ['name'])
  await restoreCollection(Note, data.notes as any[] || [], ['title'])
  await restoreCollection(Journal, data.journal as any[] || [], ['date'])
  await restoreCollection(Workout, data.workouts as any[] || [], ['date', 'name'])
  await restoreCollection(Meal, data.meals as any[] || [], ['date', 'name'])
  await restoreCollection(SleepLog, data.sleep as any[] || [], ['date'])
  await restoreCollection(WaterLog, data.water as any[] || [], ['date'])
  await restoreCollection(BodyLog, data.body as any[] || [], ['date'])
  await restoreCollection(Expense, data.expenses as any[] || [], ['date', 'amount', 'description'])
  await restoreCollection(Book, data.books as any[] || [], ['title'])
  await restoreCollection(Bookmark, data.bookmarks as any[] || [], ['url'])
  await restoreCollection(Flashcard, data.flashcards as any[] || [], ['front'])
  await restoreCollection(Capture, data.captures as any[] || [], ['content', 'createdAt'])
  await restoreCollection(Gratitude, data.gratitude as any[] || [], ['date', 'content'])
  await restoreCollection(WishlistItem, data.wishlist as any[] || [], ['title'])
  await restoreCollection(FocusSession, data.focus as any[] || [], ['startedAt'])

  // Restore safe settings if present
  if (backup.safeUserSettings && typeof backup.safeUserSettings === 'object') {
    try {
      const { aiKeys, ...safeSettings } = backup.safeUserSettings as Record<string, unknown>
      // Only restore display settings (accent color, goals) — never restore AI keys from backup
      if (safeSettings.accentColor || safeSettings.goals) {
        const settingsUpdate: Record<string, unknown> = {}
        if (safeSettings.accentColor) settingsUpdate['settings.accentColor'] = safeSettings.accentColor
        if (safeSettings.goals) settingsUpdate['settings.goals'] = safeSettings.goals
        await User.findByIdAndUpdate(userId, { $set: settingsUpdate })
      }
    } catch (e) {
      errors.push(`Non-fatal: Could not restore settings: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const success = errors.filter(e => !e.startsWith('WARNING') && !e.startsWith('Non-fatal')).length === 0

  audit(userId, 'create', 'restore', fileId, {
    eventType: 'backup.restored',
    source: 'manual',
    metadata: {
      fileId,
      restoredCount,
      safetyBackupId,
      backupDate: backup.manifest.createdAt,
      hasErrors: errors.length > 0
    }
  })

  console.log(`[RestoreService] Restore completed for user ${userId}: ${restoredCount} records, ${errors.length} errors`)

  return { success, restoredCount, safetyBackupId, safetyBackupName, errors }
}
