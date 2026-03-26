'use client'

import { useEffect, useState, useMemo } from 'react'
import { useJournalStore } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, BookOpen, Search, Calendar, Tag, Smile } from 'lucide-react'
import { MoodIcon, MOOD_LABELS, MOOD_ICONS } from '@/lib/icons'

const MOOD_COUNT = 5

function SimpleEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="border border-border bg-bg-elevated rounded-lg p-4 focus-within:border-accent-muted transition-colors min-h-[200px]">
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="Write your thoughts..."
        className="w-full bg-transparent text-text-primary text-sm leading-relaxed resize-none outline-none min-h-[180px]" />
    </div>
  )
}

export function JournalView() {
  const { entries, isLoading, fetchEntries, saveEntry, deleteEntry } = useJournalStore()
  const [showNew, setShowNew] = useState(false)
  const [activeEntry, setActiveEntry] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editMood, setEditMood] = useState(3)
  const [editTags, setEditTags] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [moodFilter, setMoodFilter] = useState<number | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const today = toISODate()

  useEffect(() => { fetchEntries().catch(() => {}) }, [fetchEntries])

  const startNew = () => {
    setActiveEntry(null)
    setEditTitle('')
    setEditContent('')
    setEditMood(3)
    setEditTags('')
    setShowNew(true)
  }

  const startEdit = (entry: typeof entries[0]) => {
    setActiveEntry(entry._id)
    setEditTitle(entry.title)
    setEditContent(entry.content?.replace(/<[^>]*>/g, '') || '')
    setEditMood(entry.mood)
    setEditTags(entry.tags?.join(', ') || '')
    setShowNew(true)
  }

  const handleSave = async () => {
    const tags = editTags.split(',').map((t) => t.trim()).filter(Boolean)
    const data: Record<string, unknown> = {
      date: today,
      title: editTitle || `Journal — ${formatDate(today)}`,
      content: `<p>${editContent.split('\n').join('</p><p>')}</p>`,
      mood: editMood,
      tags,
    }
    await saveEntry(data)
    setShowNew(false)
    setActiveEntry(null)
  }

  // All unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    entries.forEach(e => e.tags?.forEach((t: string) => tags.add(t)))
    return Array.from(tags).sort()
  }, [entries])

  // Mood stats
  const avgMood = entries.length > 0 ? (entries.reduce((s, e) => s + e.mood, 0) / entries.length).toFixed(1) : '0'
  const moodDistribution = MOOD_ICONS.map((_, i) => entries.filter(e => e.mood === i + 1).length)

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matches = (e.title?.toLowerCase().includes(q)) || (e.content?.toLowerCase().includes(q)) || (e.tags?.some((t: string) => t.toLowerCase().includes(q)))
        if (!matches) return false
      }
      if (moodFilter && e.mood !== moodFilter) return false
      if (tagFilter && !e.tags?.includes(tagFilter)) return false
      return true
    })
  }, [entries, searchQuery, moodFilter, tagFilter])

  const todaysEntry = entries.find(e => {
    const d = typeof e.date === 'string' ? e.date : toISODate(new Date(e.date))
    return d === today
  })

  // Streak
  const journalStreak = useMemo(() => {
    let streak = 0
    const d = new Date()
    for (let i = 0; i < 365; i++) {
      const date = toISODate(d)
      const hasEntry = entries.some(e => (typeof e.date === 'string' ? e.date : toISODate(new Date(e.date))) === date)
      if (hasEntry) { streak++; d.setDate(d.getDate() - 1) }
      else if (i > 0) break
      else { d.setDate(d.getDate() - 1) }
    }
    return streak
  }, [entries])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-accent" /> Journal
          </h1>
          <p className="text-text-muted text-sm mt-1">{entries.length} entries · {journalStreak}d writing streak</p>
        </div>
        <button onClick={startNew} className="btn flex items-center gap-2"><Plus className="w-4 h-4" /> New Entry</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card">
          <Smile className="w-4 h-4 text-accent mb-1" />
          <p className="text-xl font-bold text-text-primary">{avgMood}</p>
          <p className="text-[10px] text-text-muted">Avg mood</p>
        </div>
        <div className="card">
          <Calendar className="w-4 h-4 text-blue-soft mb-1" />
          <p className="text-xl font-bold text-text-primary">{journalStreak}d</p>
          <p className="text-[10px] text-text-muted">Writing streak</p>
        </div>
        <div className="card">
          <Tag className="w-4 h-4 text-purple-soft mb-1" />
          <p className="text-xl font-bold text-text-primary">{allTags.length}</p>
          <p className="text-[10px] text-text-muted">Unique tags</p>
        </div>
        <div className="card">
          <div className="flex gap-1 mb-1">
            {moodDistribution.map((count, i) => (
              <div key={i} className="flex-1 bg-bg-elevated rounded-sm overflow-hidden" style={{ height: 20 }}>
                <div className="bg-accent/60 rounded-sm" style={{ height: `${entries.length > 0 ? (count / entries.length) * 100 : 0}%`, marginTop: `${entries.length > 0 ? 100 - (count / entries.length) * 100 : 100}%` }} />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-text-muted">Mood distribution</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search entries..."
            className="input pl-10" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-bg-surface border border-border rounded-lg p-1">
            {MOOD_ICONS.map((_, i) => (
              <button key={i} onClick={() => setMoodFilter(moodFilter === i + 1 ? null : i + 1)}
                className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${
                  moodFilter === i + 1 ? 'bg-accent/20 scale-110' : 'opacity-50 hover:opacity-100'
                }`}><MoodIcon mood={i + 1} size={16} /></button>
            ))}
          </div>
        </div>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tagFilter && (
            <button onClick={() => setTagFilter(null)} className="badge bg-accent/20 text-accent text-[10px]">✕ Clear</button>
          )}
          {allTags.map(tag => (
            <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className={`badge text-[10px] transition-all ${tagFilter === tag ? 'bg-accent/20 text-accent' : 'hover:bg-bg-hover'}`}>#{tag}</button>
          ))}
        </div>
      )}

      {/* Editor */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="card border-accent/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">{activeEntry ? 'Edit Entry' : 'New Entry'}</h3>
                <button onClick={() => setShowNew(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
              </div>
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title (optional)"
                className="input w-full mb-3 text-lg font-medium" />
              <SimpleEditor value={editContent} onChange={setEditContent} />
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-muted mr-1">Mood:</span>
                  {MOOD_ICONS.map((_, i) => (
                    <button key={i} onClick={() => setEditMood(i + 1)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                        editMood === i + 1 ? 'bg-accent/20 scale-125' : 'opacity-40 hover:opacity-100'
                      }`} title={MOOD_LABELS[i]}><MoodIcon mood={i + 1} size={18} /></button>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-text-muted" />
                <input type="text" value={editTags} onChange={(e) => setEditTags(e.target.value)}
                  placeholder="Tags (comma separated)" className="input flex-1 text-xs" />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSave} className="btn flex-1">Save Entry</button>
                <button onClick={() => setShowNew(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Entries List */}
      {isLoading ? (
        <div className="text-center py-12"><p className="text-sm text-text-muted animate-pulse">Loading entries...</p></div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-16 card">
          <p className="text-sm text-text-muted">{searchQuery || moodFilter || tagFilter ? 'No matching entries' : 'Your journal is empty'}</p>
          {!searchQuery && !moodFilter && <p className="text-xs text-text-muted mt-1">Start documenting your journey</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map((entry) => {
            const plainContent = entry.content?.replace(/<[^>]*>/g, '') || ''
            return (
              <motion.div key={entry._id} layout
                className="card group cursor-pointer hover:border-border-strong transition-all"
                onClick={() => startEdit(entry)}>
                <div className="flex items-start gap-3">
                  <span className="shrink-0"><MoodIcon mood={entry.mood || 3} size={24} /></span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium text-text-primary truncate">{entry.title || 'Untitled'}</h3>
                      <span className="text-[10px] text-text-muted shrink-0 ml-2">{formatDate(entry.date)}</span>
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-2">{plainContent.slice(0, 200)}</p>
                    {entry.tags?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {entry.tags.map((tag: string) => <span key={tag} className="badge text-[10px]">#{tag}</span>)}
                      </div>
                    )}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteEntry(entry._id) }}
                    className="text-text-muted hover:text-red-soft transition-all p-1 opacity-0 group-hover:opacity-100 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Today prompt */}
      {!todaysEntry && !showNew && (
        <div className="card mt-6 text-center border-accent/20">
          <p className="text-sm text-text-secondary mb-2">You haven&apos;t written today</p>
          <button onClick={startNew} className="btn text-xs">Write Today&apos;s Entry</button>
        </div>
      )}
    </div>
  )
}
