import { Router } from 'express'
import { authMiddleware, isDemoUser, AuthRequest } from '../lib/auth'
import { asyncHandler } from '../middleware/asyncHandler'
import { validateBackup, applyRestore } from '../lib/RestoreService'
import { runBackupForUser } from '../lib/BackupService'
import { DEMO_HABITS, DEMO_JOURNAL, DEMO_WORKOUTS, DEMO_MEALS, DEMO_TASKS, DEMO_GOALS } from '../lib/demo-data'
import { Habit } from '../models/Habit'
import { Journal } from '../models/Journal'
import { Workout } from '../models/Workout'
import { Meal } from '../models/Meal'
import { Task } from '../models/Task'
import { Goal } from '../models/Goal'
import { audit } from '../lib/audit'

const router = Router()
router.use(authMiddleware)

// ─── Legacy JSON Export (kept for local file backup) ──────────────────────────

// GET /api/backup/export
router.get('/export', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId

  if (isDemoUser(userId)) {
    return res.json({
      exportedAt: new Date().toISOString(),
      version: '1.0',
      data: {
        habits: DEMO_HABITS,
        journal: DEMO_JOURNAL,
        workouts: DEMO_WORKOUTS,
        meals: DEMO_MEALS,
        tasks: DEMO_TASKS,
        goals: DEMO_GOALS,
      },
    })
  }

  const uid = userId
  const [habits, journal, workouts, meals, tasks, goals] = await Promise.all([
    Habit.find({ userId: uid }).lean(),
    Journal.find({ userId: uid }).lean(),
    Workout.find({ userId: uid }).lean(),
    Meal.find({ userId: uid }).lean(),
    Task.find({ userId: uid }).lean(),
    Goal.find({ userId: uid }).lean(),
  ])

  return res.json({
    exportedAt: new Date().toISOString(),
    version: '1.0',
    data: { habits, journal, workouts, meals, tasks, goals },
  })
}))

// POST /api/backup/import (legacy 6-collection upsert)
router.post('/import', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId

  if (isDemoUser(userId)) {
    return res.json({ message: 'Import not available in demo mode', count: 0 })
  }

  const body = req.body
  if (!body.data || !body.version) {
    return res.status(400).json({ error: 'Invalid backup file format' })
  }

  const uid = userId
  const { data } = body
  let count = 0
  const MAX_ITEMS = 5000

  if (data.habits?.length) {
    for (const h of data.habits.slice(0, MAX_ITEMS)) {
      const { _id, userId: _, ...rest } = h
      await Habit.findOneAndUpdate({ userId: uid, name: rest.name }, { ...rest, userId: uid }, { upsert: true, new: true })
      count++
    }
  }
  if (data.journal?.length) {
    for (const j of data.journal.slice(0, MAX_ITEMS)) {
      const { _id, userId: _, ...rest } = j
      await Journal.findOneAndUpdate({ userId: uid, date: rest.date }, { ...rest, userId: uid }, { upsert: true, new: true })
      count++
    }
  }
  if (data.workouts?.length) {
    for (const w of data.workouts.slice(0, MAX_ITEMS)) {
      const { _id, userId: _, ...rest } = w
      await Workout.findOneAndUpdate({ userId: uid, date: rest.date, name: rest.name }, { ...rest, userId: uid }, { upsert: true, new: true })
      count++
    }
  }
  if (data.meals?.length) {
    for (const m of data.meals.slice(0, MAX_ITEMS)) {
      const { _id, userId: _, ...rest } = m
      await Meal.findOneAndUpdate({ userId: uid, date: rest.date, name: rest.name }, { ...rest, userId: uid }, { upsert: true, new: true })
      count++
    }
  }
  if (data.tasks?.length) {
    for (const t of data.tasks.slice(0, MAX_ITEMS)) {
      const { _id, userId: _, ...rest } = t
      await Task.findOneAndUpdate({ userId: uid, title: rest.title }, { ...rest, userId: uid }, { upsert: true, new: true })
      count++
    }
  }
  if (data.goals?.length) {
    for (const g of data.goals.slice(0, MAX_ITEMS)) {
      const { _id, userId: _, ...rest } = g
      await Goal.findOneAndUpdate({ userId: uid, title: rest.title }, { ...rest, userId: uid }, { upsert: true, new: true })
      count++
    }
  }

  audit(uid, 'create', 'backup_import', 'bulk', { after: { count, collections: Object.keys(data) } })
  return res.json({ message: `Successfully imported ${count} records`, count })
}))

// ─── Safe Restore — Step 1: Validate ──────────────────────────────────────────

/**
 * POST /api/backup/restore/validate
 *
 * Downloads the specified Drive backup, validates its manifest and checksum,
 * verifies user ownership. Does NOT modify the database.
 *
 * Body: { fileId: string }
 * Returns: { valid, errors, manifest, collectionSummary, checksumValid }
 */
router.post('/restore/validate', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId

  if (isDemoUser(userId)) {
    return res.status(400).json({ error: 'Restore not available in demo mode' })
  }

  const { fileId } = req.body
  if (!fileId || typeof fileId !== 'string') {
    return res.status(400).json({ error: 'fileId is required' })
  }

  const result = await validateBackup(userId, fileId)
  return res.json(result)
}))

// ─── Safe Restore — Step 2: Confirm ───────────────────────────────────────────

/**
 * POST /api/backup/restore/confirm
 *
 * REQUIRES explicit { confirm: true } in body.
 *
 * Steps:
 *  1. Re-validates the backup
 *  2. Creates a safety checkpoint backup of current data in Drive
 *  3. Applies merge-restore to all collections
 *  4. Reports result
 *
 * Body: { fileId: string, confirm: true }
 * Returns: { success, restoredCount, safetyBackupId, safetyBackupName, errors }
 */
router.post('/restore/confirm', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId

  if (isDemoUser(userId)) {
    return res.status(400).json({ error: 'Restore not available in demo mode' })
  }

  const { fileId, confirm } = req.body
  if (!fileId || typeof fileId !== 'string') {
    return res.status(400).json({ error: 'fileId is required' })
  }

  if (confirm !== true) {
    return res.status(400).json({
      error: 'Restore requires explicit confirmation. Set confirm: true to proceed.',
      code: 'CONFIRMATION_REQUIRED'
    })
  }

  const result = await applyRestore(userId, fileId, confirm)
  const statusCode = result.success ? 200 : 500
  return res.status(statusCode).json(result)
}))

// ─── Manual Drive Backup (via BackupService) ──────────────────────────────────

/**
 * POST /api/backup/drive
 *
 * Triggers a full backup using BackupService (all 21 collections, manifest, checksum, retention).
 */
router.post('/drive', asyncHandler(async (req: AuthRequest, res) => {
  const userId = req.user!.userId

  if (isDemoUser(userId)) {
    return res.status(400).json({ error: 'Drive backup not available in demo mode' })
  }

  const result = await runBackupForUser(userId, 'manual')

  if (result.status === 'failed') {
    return res.status(500).json({ error: result.error || 'Backup failed', status: 'failed' })
  }

  return res.status(201).json({
    status: 'success',
    fileName: result.fileName,
    fileId: result.fileId,
    fileLink: result.fileLink,
    totalRecords: result.totalRecords,
  })
}))

export default router
