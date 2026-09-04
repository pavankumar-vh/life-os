import './lib/env'

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { connectDB } from './lib/db'
import { rateLimit } from 'express-rate-limit'
import { errorHandler } from './middleware/errorHandler'

// Route imports
import authRoutes from './routes/auth'
import habitsRoutes from './routes/habits'
import tasksRoutes from './routes/tasks'
import goalsRoutes from './routes/goals'
import journalRoutes from './routes/journal'
import workoutsRoutes from './routes/workouts'
import mealsRoutes from './routes/meals'
import waterRoutes from './routes/water'
import sleepRoutes from './routes/sleep'
import bodyRoutes from './routes/body'
import gratitudeRoutes from './routes/gratitude'
import expensesRoutes from './routes/expenses'
import notesRoutes from './routes/notes'
import booksRoutes from './routes/books'
import bookmarksRoutes from './routes/bookmarks'
import capturesRoutes from './routes/captures'
import flashcardsRoutes from './routes/flashcards'
import projectsRoutes from './routes/projects'
import wishlistRoutes from './routes/wishlist'
import whiteboardsRoutes from './routes/whiteboards'
import timelineRoutes from './routes/timeline'
import backupRoutes from './routes/backup'
import chatRoutes from './routes/chat'
import googleRoutes from './routes/google'
import settingsRoutes from './routes/settings'
import focusRoutes from './routes/focus'
import uploadsRoutes from './routes/uploads'
import vaultRoutes from './routes/vault'
import searchRoutes from './routes/search'
import todayRoutes from './routes/today'
import activityRoutes from './routes/activity'
import reviewRoutes from './routes/review'
import exportRoutes from './routes/export'

const app = express()
const PORT = process.env.PORT || 4000
let dbReady = false

const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_URLS || '').split(',').map((origin) => origin.trim()),
  ].filter(Boolean) as string[]
)

app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.has(origin)) return callback(null, true)
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:3000$/.test(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.', code: 'RATE_LIMIT_EXCEEDED' }
})
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later.', code: 'RATE_LIMIT_EXCEEDED' }
})

app.use(globalLimiter)
app.use(express.json({ limit: '2mb' }))
// Higher limit for backup/import endpoints
app.use('/api/backup', express.json({ limit: '10mb' }))

// Health check — registered FIRST so Railway can reach it even before DB is ready
app.get('/api/health', (_req, res) => {
  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'ok' : 'degraded',
    db: dbReady ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  })
})

// Routes
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/habits', habitsRoutes)
app.use('/api/tasks', tasksRoutes)
app.use('/api/goals', goalsRoutes)
app.use('/api/journal', journalRoutes)
app.use('/api/workouts', workoutsRoutes)
app.use('/api/meals', mealsRoutes)
app.use('/api/water', waterRoutes)
app.use('/api/sleep', sleepRoutes)
app.use('/api/body', bodyRoutes)
app.use('/api/gratitude', gratitudeRoutes)
app.use('/api/expenses', expensesRoutes)
app.use('/api/notes', notesRoutes)
app.use('/api/books', booksRoutes)
app.use('/api/bookmarks', bookmarksRoutes)
app.use('/api/captures', capturesRoutes)
app.use('/api/flashcards', flashcardsRoutes)
app.use('/api/projects', projectsRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/whiteboards', whiteboardsRoutes)
app.use('/api/timeline', timelineRoutes)
app.use('/api/backup', backupRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/google', googleRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/focus', focusRoutes)
app.use('/api/uploads', uploadsRoutes)
app.use('/api/vault', vaultRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/today', todayRoutes)
app.use('/api/activity', activityRoutes)
app.use('/api/review', reviewRoutes)
app.use('/api/export', exportRoutes)

// Error Handler MUST be the last middleware
app.use(errorHandler)

async function start() {
  // Start server first so health check is immediately reachable
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`)
  })

  // Connect DB after server is up
  try {
    await connectDB()
    dbReady = true
  } catch (err) {
    console.error('DB connection failed — server still running, health will report degraded:', err)
  }

  // ─── Scheduled Automatic Backups ──────────────────────────────────────────
  // Runs on configurable interval (default: 24h). Lightweight — uses setInterval,
  // no external job scheduler required. Suitable for 1 vCPU / 1 GB RAM deployment.
  const BACKUP_INTERVAL_HOURS = parseInt(process.env.BACKUP_INTERVAL_HOURS || '24')
  const BACKUP_INTERVAL_MS = BACKUP_INTERVAL_HOURS * 60 * 60 * 1000

  setInterval(async () => {
    if (!dbReady) {
      console.log('[Scheduler] Skipping backup: DB not ready')
      return
    }

    console.log('[Scheduler] Starting scheduled backups...')
    try {
      const { User } = await import('./models/User')
      const { runBackupForUser } = await import('./lib/BackupService')

      // Find all users who have Google connected and have backupScheduleEnabled
      const users = await User.find({
        'settings.backupScheduleEnabled': true,
        'googleTokens.access_token': { $exists: true },
      }).select('_id').lean()

      if (users.length === 0) {
        console.log('[Scheduler] No users with scheduled backups enabled')
        return
      }

      for (const user of users) {
        try {
          const result = await runBackupForUser(String(user._id), 'scheduled')
          if (result.status === 'success') {
            console.log(`[Scheduler] Backup succeeded for user ${user._id}`)
          } else {
            console.error(`[Scheduler] Backup failed for user ${user._id}: ${result.error}`)
          }
        } catch (e) {
          console.error(`[Scheduler] Unexpected error for user ${user._id}:`, e)
        }
      }
    } catch (err) {
      console.error('[Scheduler] Scheduled backup run failed:', err)
    }
  }, BACKUP_INTERVAL_MS)

  console.log(`[Scheduler] Automatic backups scheduled every ${BACKUP_INTERVAL_HOURS}h`)
}

start().catch(console.error)
