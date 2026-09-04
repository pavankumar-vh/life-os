import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../lib/auth'

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

const router = Router()
router.use(authMiddleware)

// Helper to scrub secrets from user object
function scrubUser(user: any) {
  const safeUser = { ...user }
  delete safeUser.password
  delete safeUser.passwordResetToken
  delete safeUser.passwordResetExpires
  delete safeUser.mfaSecret
  delete safeUser.mfaPendingSecret
  delete safeUser.mfaRecoveryCodes
  delete safeUser.googleTokens
  
  if (safeUser.settings) {
    const safeSettings = { ...safeUser.settings }
    delete safeSettings.aiKeys
    safeUser.settings = safeSettings
  }
  return safeUser
}

router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId
    const format = (req.query.format as string) || 'json'

    // Fetch user
    const rawUser = await User.findById(userId).lean()
    if (!rawUser) {
      return res.status(404).json({ error: 'User not found' })
    }
    const safeUser = scrubUser(rawUser)

    // Fetch all collections
    const [
      tasks, goals, projects, habits, notes, journal, workouts,
      meals, sleep, water, body, expenses, books, bookmarks,
      flashcards, captures, activity
    ] = await Promise.all([
      Task.find({ userId }).lean(),
      Goal.find({ userId }).lean(),
      Project.find({ userId }).lean(),
      Habit.find({ userId }).lean(),
      Note.find({ userId }).lean(),
      Journal.find({ userId }).lean(),
      Workout.find({ userId }).lean(),
      Meal.find({ userId }).lean(),
      SleepLog.find({ userId }).lean(),
      WaterLog.find({ userId }).lean(),
      BodyLog.find({ userId }).lean(),
      Expense.find({ userId }).lean(),
      Book.find({ userId }).lean(),
      Bookmark.find({ userId }).lean(),
      Flashcard.find({ userId }).lean(),
      Capture.find({ userId }).lean(),
      AuditLog.find({ userId }).lean(),
    ])

    const data = {
      tasks, goals, projects, habits, notes, journal, workouts,
      meals, sleep, water, body, expenses, books, bookmarks,
      flashcards, captures, activity
    }

    if (format === 'md') {
      res.setHeader('Content-Type', 'text/markdown')
      res.setHeader('Content-Disposition', 'attachment; filename="life-os-export.md"')
      
      let md = `# Life OS Export\n`
      md += `Exported At: ${new Date().toISOString()}\n`
      md += `User: ${safeUser.name} (${safeUser.email})\n\n`

      md += `## Tasks\n`
      tasks.forEach((t: any) => {
        md += `- **${t.title}** (Status: ${t.status})\n`
        if (t.dueDate) md += `  Due: ${t.dueDate}\n`
      })
      md += `\n`

      md += `## Notes\n`
      notes.forEach((n: any) => {
        md += `### ${n.title}\n`
        md += `Created: ${new Date(n.createdAt).toISOString()}\n`
        md += `${n.content}\n\n`
      })

      md += `## Journal\n`
      journal.forEach((j: any) => {
        md += `### ${j.date}\n`
        md += `Mood: ${j.mood}/5\n`
        md += `${j.content}\n\n`
      })

      md += `## Captures\n`
      captures.forEach((c: any) => {
        md += `- [${new Date(c.createdAt).toISOString()}] ${c.content}\n`
      })
      md += `\n`

      return res.send(md)
    }

    // Default JSON
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename="life-os-export.json"')
    return res.json({
      exportedAt: new Date().toISOString(),
      version: '1.0',
      user: safeUser,
      data
    })

  } catch (e) {
    console.error('GET /api/export error:', e)
    return res.status(500).json({ error: 'Server error' })
  }
})

export default router
