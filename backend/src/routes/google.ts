import { Router, Response } from 'express'
import { google } from 'googleapis'
import { User } from '../models/User'
import { authMiddleware, AuthRequest, isDemoUser } from '../lib/auth'
import { getOAuth2Client, getAuthUrl, getAuthedClient } from '../lib/google'

const router = Router()
router.use(authMiddleware)

// ─── Google OAuth ─────────────────────────────────

// GET /api/google/auth-url — generates the consent screen URL
router.get('/auth-url', (req: AuthRequest, res: Response) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(400).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' })
  }
  const state = req.user!.userId
  const url = getAuthUrl(state)
  return res.json({ url })
})

// POST /api/google/callback — exchanges code for tokens and stores them
router.post('/callback', async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'Authorization code required' })

    const client = getOAuth2Client()
    const { tokens } = await client.getToken(code)

    if (isDemoUser(req.user!.userId)) {
      return res.json({ connected: true })
    }

    await User.findByIdAndUpdate(req.user!.userId, {
      googleTokens: {
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token || undefined,
        expiry_date: tokens.expiry_date || undefined,
      },
    })

    return res.json({ connected: true })
  } catch (error) {
    console.error('Google callback error:', error)
    return res.status(500).json({ error: 'Failed to connect Google account' })
  }
})

// GET /api/google/status — checks if Google is connected
router.get('/status', async (req: AuthRequest, res: Response) => {
  try {
    if (isDemoUser(req.user!.userId)) {
      return res.json({ connected: false })
    }
    const user = await User.findById(req.user!.userId).select('googleTokens')
    return res.json({ connected: !!user?.googleTokens?.access_token })
  } catch {
    return res.json({ connected: false })
  }
})

// POST /api/google/disconnect — removes Google tokens
router.post('/disconnect', async (req: AuthRequest, res: Response) => {
  try {
    if (!isDemoUser(req.user!.userId)) {
      await User.findByIdAndUpdate(req.user!.userId, { $unset: { googleTokens: 1 } })
    }
    return res.json({ disconnected: true })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to disconnect' })
  }
})

// Helper: get authed client for a user
async function getUserClient(userId: string) {
  const user = await User.findById(userId).select('googleTokens')
  if (!user?.googleTokens?.access_token) {
    throw new Error('Google not connected')
  }
  const client = getAuthedClient({
    access_token: user.googleTokens.access_token,
    refresh_token: user.googleTokens.refresh_token,
  })

  // Listen for token refresh and persist
  client.on('tokens', async (tokens) => {
    const update: Record<string, string | number> = {}
    if (tokens.access_token) update['googleTokens.access_token'] = tokens.access_token
    if (tokens.refresh_token) update['googleTokens.refresh_token'] = tokens.refresh_token
    if (tokens.expiry_date) update['googleTokens.expiry_date'] = tokens.expiry_date
    if (Object.keys(update).length) {
      await User.findByIdAndUpdate(userId, { $set: update })
    }
  })

  return client
}

// ─── Google Calendar ──────────────────────────────

// GET /api/google/calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/calendar/events', async (req: AuthRequest, res: Response) => {
  try {
    if (isDemoUser(req.user!.userId)) {
      return res.json([])
    }

    const client = await getUserClient(req.user!.userId)
    const calendar = google.calendar({ version: 'v3', auth: client })

    const from = (req.query.from as string) || new Date().toISOString().split('T')[0]
    const to = (req.query.to as string) || (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0] })()

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: `${from}T00:00:00Z`,
      timeMax: `${to}T23:59:59Z`,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    })

    const events = (response.data.items || []).map(e => ({
      id: e.id,
      title: e.summary || 'No title',
      description: e.description || '',
      start: e.start?.dateTime || e.start?.date || '',
      end: e.end?.dateTime || e.end?.date || '',
      allDay: !e.start?.dateTime,
      location: e.location || '',
      htmlLink: e.htmlLink || '',
    }))

    return res.json(events)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg === 'Google not connected') return res.status(400).json({ error: msg })
    console.error('Calendar fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch calendar events' })
  }
})

// POST /api/google/calendar/events — create a new event
router.post('/calendar/events', async (req: AuthRequest, res: Response) => {
  try {
    if (isDemoUser(req.user!.userId)) {
      return res.status(400).json({ error: 'Demo user cannot create events' })
    }

    const client = await getUserClient(req.user!.userId)
    const calendar = google.calendar({ version: 'v3', auth: client })
    const { title, description, start, end, allDay } = req.body

    if (!title || !start) return res.status(400).json({ error: 'Title and start date required' })

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        description,
        start: allDay ? { date: start } : { dateTime: start },
        end: allDay ? { date: end || start } : { dateTime: end || start },
      },
    })

    return res.json({
      id: event.data.id,
      title: event.data.summary,
      start: event.data.start?.dateTime || event.data.start?.date,
      end: event.data.end?.dateTime || event.data.end?.date,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg === 'Google not connected') return res.status(400).json({ error: msg })
    console.error('Calendar create error:', error)
    return res.status(500).json({ error: 'Failed to create event' })
  }
})

// ─── Google Drive Backup ──────────────────────────

// POST /api/google/drive/backup — backs up all user data to Drive
router.post('/drive/backup', async (req: AuthRequest, res: Response) => {
  try {
    if (isDemoUser(req.user!.userId)) {
      return res.status(400).json({ error: 'Demo user cannot backup to Drive' })
    }

    const client = await getUserClient(req.user!.userId)
    const drive = google.drive({ version: 'v3', auth: client })
    const userId = req.user!.userId

    // Gather all data (import models dynamically to avoid circular deps)
    const { Habit } = await import('../models/Habit')
    const { Task } = await import('../models/Task')
    const { Goal } = await import('../models/Goal')
    const { Journal } = await import('../models/Journal')
    const { Workout } = await import('../models/Workout')
    const { Meal } = await import('../models/Meal')
    const { WaterLog } = await import('../models/WaterLog')
    const { SleepLog } = await import('../models/SleepLog')
    const { BodyLog } = await import('../models/BodyLog')
    const { Note } = await import('../models/Note')
    const { Expense } = await import('../models/Expense')
    const { Book } = await import('../models/Book')
    const { Bookmark } = await import('../models/Bookmark')
    const { Capture } = await import('../models/Capture')
    const { Flashcard } = await import('../models/Flashcard')
    const { Project } = await import('../models/Project')
    const { Gratitude } = await import('../models/Gratitude')
    const { WishlistItem } = await import('../models/WishlistItem')
    const { Whiteboard } = await import('../models/Whiteboard')

    const q = { userId }
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      habits: await Habit.find(q).lean(),
      tasks: await Task.find(q).lean(),
      goals: await Goal.find(q).lean(),
      journal: await Journal.find(q).lean(),
      workouts: await Workout.find(q).lean(),
      meals: await Meal.find(q).lean(),
      water: await WaterLog.find(q).lean(),
      sleep: await SleepLog.find(q).lean(),
      body: await BodyLog.find(q).lean(),
      notes: await Note.find(q).lean(),
      expenses: await Expense.find(q).lean(),
      books: await Book.find(q).lean(),
      bookmarks: await Bookmark.find(q).lean(),
      captures: await Capture.find(q).lean(),
      flashcards: await Flashcard.find(q).lean(),
      projects: await Project.find(q).lean(),
      gratitude: await Gratitude.find(q).lean(),
      wishlist: await WishlistItem.find(q).lean(),
      whiteboards: await Whiteboard.find(q).lean(),
    }

    const fileName = `lifeos-backup-${new Date().toISOString().split('T')[0]}.json`
    const fileContent = JSON.stringify(data, null, 2)

    // Check if LifeOS folder exists, create if not
    const folderSearch = await drive.files.list({
      q: "name='LifeOS Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id)',
      spaces: 'drive',
    })

    let folderId: string
    if (folderSearch.data.files && folderSearch.data.files.length > 0) {
      folderId = folderSearch.data.files[0].id!
    } else {
      const folder = await drive.files.create({
        requestBody: {
          name: 'LifeOS Backups',
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      })
      folderId = folder.data.id!
    }

    // Upload backup file
    const file = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
        mimeType: 'application/json',
      },
      media: {
        mimeType: 'application/json',
        body: fileContent,
      },
      fields: 'id,name,webViewLink,size',
    })

    return res.json({
      success: true,
      file: {
        id: file.data.id,
        name: file.data.name,
        link: file.data.webViewLink,
        size: file.data.size,
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg === 'Google not connected') return res.status(400).json({ error: msg })
    console.error('Drive backup error:', error)
    return res.status(500).json({ error: 'Failed to backup to Google Drive' })
  }
})

// GET /api/google/drive/backups — list existing backups
router.get('/drive/backups', async (req: AuthRequest, res: Response) => {
  try {
    if (isDemoUser(req.user!.userId)) return res.json([])

    const client = await getUserClient(req.user!.userId)
    const drive = google.drive({ version: 'v3', auth: client })

    const folderSearch = await drive.files.list({
      q: "name='LifeOS Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id)',
      spaces: 'drive',
    })

    if (!folderSearch.data.files?.length) return res.json([])

    const folderId = folderSearch.data.files[0].id!
    const files = await drive.files.list({
      q: `'${folderId}' in parents and name contains 'lifeos-backup' and trashed=false`,
      fields: 'files(id,name,createdTime,size,webViewLink)',
      orderBy: 'createdTime desc',
      pageSize: 20,
    })

    return res.json(
      (files.data.files || []).map(f => ({
        id: f.id,
        name: f.name,
        createdAt: f.createdTime,
        size: f.size,
        link: f.webViewLink,
      }))
    )
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg === 'Google not connected') return res.status(400).json({ error: msg })
    console.error('Drive list error:', error)
    return res.status(500).json({ error: 'Failed to list backups' })
  }
})

// ─── Google Fitness ───────────────────────────────

// GET /api/google/fitness/steps?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/fitness/steps', async (req: AuthRequest, res: Response) => {
  try {
    if (isDemoUser(req.user!.userId)) return res.json([])

    const client = await getUserClient(req.user!.userId)
    const fitness = google.fitness({ version: 'v1', auth: client })

    const from = req.query.from as string
    const to = req.query.to as string
    const startTime = new Date(`${from || new Date().toISOString().split('T')[0]}T00:00:00Z`).getTime() * 1000000
    const endTime = new Date(`${to || new Date().toISOString().split('T')[0]}T23:59:59Z`).getTime() * 1000000

    const response = await fitness.users.dataset.aggregate({
      userId: 'me',
      requestBody: {
        aggregateBy: [
          { dataTypeName: 'com.google.step_count.delta' },
          { dataTypeName: 'com.google.calories.expended' },
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: String(Math.floor(startTime / 1000000)),
        endTimeMillis: String(Math.floor(endTime / 1000000)),
      },
    } as any)

    const days = ((response as any).data.bucket || []).map((bucket: any) => {
      const date = new Date(parseInt(bucket.startTimeMillis!)).toISOString().split('T')[0]
      let steps = 0
      let calories = 0
      for (const ds of bucket.dataset || []) {
        for (const pt of ds.point || []) {
          for (const val of pt.value || []) {
            if (ds.dataSourceId?.includes('step_count')) steps += val.intVal || 0
            if (ds.dataSourceId?.includes('calories')) calories += val.fpVal || 0
          }
        }
      }
      return { date, steps, calories: Math.round(calories) }
    })

    return res.json(days)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg === 'Google not connected') return res.status(400).json({ error: msg })
    console.error('Fitness fetch error:', error)
    return res.status(500).json({ error: 'Failed to fetch fitness data' })
  }
})

export default router
