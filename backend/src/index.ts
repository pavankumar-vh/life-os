import dotenv from 'dotenv'
dotenv.config({ path: '../.env.local' })

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { connectDB } from './lib/db'

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

const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}))
app.use(express.json({ limit: '2mb' }))
// Higher limit for backup/import endpoints
app.use('/api/backup', express.json({ limit: '10mb' }))

// Routes
app.use('/api/auth', authRoutes)
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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

async function start() {
  await connectDB()
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`)
  })
}

start().catch(console.error)
