import { Journal, IJournal } from '../models/Journal'
import { audit } from '../lib/audit'
import { NotFoundError, ValidationError } from '../lib/errors'
import { DEMO_JOURNAL } from '../lib/demo-data'
import { isDemoUser } from '../lib/auth'
import { sanitizeBody } from '../lib/sanitize'
import { isValidObjectId, isValidDate } from '../lib/utils'

// ─── JournalService ───────────────────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export class JournalService {
  /**
   * Fetch journal entries for a user. Capped at 100 most recent.
   */
  static async getEntries(userId: string, limit = 100) {
    if (isDemoUser(userId)) return DEMO_JOURNAL
    const cap = Math.min(Math.max(1, limit), 365) // sanity: 1–365
    return Journal.find({ userId }).sort({ date: -1 }).limit(cap).lean()
  }

  /**
   * Save (upsert) a journal entry for a given date.
   * One entry per day — later write wins.
   */
  static async saveEntry(userId: string, rawData: Partial<IJournal>) {
    const data = sanitizeBody(rawData)
    const bodyId = (rawData as Record<string, unknown>)._id as string | undefined

    // Date is mandatory
    const date = data.date as string | undefined
    if (!date || !isValidDate(String(date))) {
      throw new ValidationError('date is required in YYYY-MM-DD format')
    }

    // Mood must be 1-5 if provided
    if (data.mood !== undefined) {
      const mood = Number(data.mood)
      if (!Number.isInteger(mood) || mood < 1 || mood > 5) {
        throw new ValidationError('mood must be an integer between 1 and 5')
      }
    }

    if (isDemoUser(userId)) {
      return { _id: bodyId || `demo-${Date.now()}`, ...data, userId }
    }

    const entry = await Journal.findOneAndUpdate(
      { userId, date },
      { ...data, userId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    audit(userId, 'update', 'journal', entry._id.toString(), {
      after: entry.toJSON(),
      eventType: 'journal.updated',
      source: 'manual',
      metadata: { title: entry.title, date: entry.date, mood: entry.mood },
    })

    return entry
  }

  /**
   * Delete a journal entry by ID.
   */
  static async deleteEntry(userId: string, entryId: string) {
    if (!isValidObjectId(entryId)) throw new ValidationError('Invalid journal entry ID')
    if (isDemoUser(userId)) return true

    const entry = await Journal.findOne({ _id: entryId, userId })
    if (!entry) throw new NotFoundError('Journal entry not found')

    audit(userId, 'delete', 'journal', entryId, {
      before: entry.toJSON(),
      eventType: 'journal.deleted',
      source: 'manual',
      metadata: { title: entry.title, date: entry.date },
    })

    await Journal.findOneAndDelete({ _id: entryId, userId })
    return true
  }
}
