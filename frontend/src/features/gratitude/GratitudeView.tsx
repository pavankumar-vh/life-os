'use client'

import { useEffect, useState, useMemo } from 'react'
import { useGratitudeStore, type GratitudeData } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Plus, Trash2, Sparkles, Sun, Star, Undo2 } from 'lucide-react'
import { MoodIcon, MOOD_ICONS } from '@/lib/icons'
import { DateNavigator } from '@/components/DateNavigator'
import { toast } from '@/components/Toast'

export function GratitudeView() {
  const { entries, isLoading, fetchEntries, saveEntry, deleteEntry } = useGratitudeStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ items: ['', '', ''], highlight: '', mood: 4 })
  const [pendingDelete, setPendingDelete] = useState<{ entry: GratitudeData; timer: NodeJS.Timeout } | null>(null)

  useEffect(() => { fetchEntries().catch(() => toast.error('Failed to load entries')) }, [fetchEntries])

  const [selectedDate, setSelectedDate] = useState(toISODate())
  const today = toISODate()
  const todayEntry = entries.find(e => e.date === selectedDate)

  const stats = useMemo(() => {
    const streak = (() => {
      let s = 0
      const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
      for (let i = 0; i < sorted.length; i++) {
        const expected = new Date()
        expected.setDate(expected.getDate() - i)
        if (sorted[i]?.date === toISODate(expected)) s++
        else break
      }
      return s
    })()
    const avgMood = entries.length > 0 ? +(entries.reduce((s, e) => s + e.mood, 0) / entries.length).toFixed(1) : 0
    return { streak, total: entries.length, avgMood }
  }, [entries])

  const handleSubmit = async () => {
    const items = form.items.filter(Boolean)
    if (items.length === 0) return
    await saveEntry({
      ...(todayEntry ? { _id: todayEntry._id } : {}),
      date: selectedDate,
      items,
      highlight: form.highlight,
      mood: form.mood,
    }).catch(() => toast.error('Failed to save gratitude entry'))
    setShowForm(false)
    setForm({ items: ['', '', ''], highlight: '', mood: 4 })
  }

  useEffect(() => {
    if (todayEntry) {
      const items = [...todayEntry.items]
      while (items.length < 3) items.push('')
      setForm({ items, highlight: todayEntry.highlight, mood: todayEntry.mood })
    }
  }, [todayEntry])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-400" /> Gratitude
          </h1>
          <DateNavigator value={selectedDate} onChange={setSelectedDate} />
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> {todayEntry ? 'Edit' : 'Write'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card text-center">
          <Sparkles className="w-4 h-4 text-accent mx-auto mb-1" />
          <p className="text-2xl font-bold text-accent">{stats.streak}</p>
          <p className="text-[11px] text-text-secondary">Day Streak</p>
        </div>
        <div className="card text-center">
          <Sun className="w-4 h-4 text-pink-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-pink-400">{stats.total}</p>
          <p className="text-[11px] text-text-secondary">Total Entries</p>
        </div>
        <div className="card text-center">
          <Heart className="w-4 h-4 text-green-soft mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-soft">{stats.avgMood}/5</p>
          <p className="text-[11px] text-text-secondary">Avg Mood</p>
        </div>
      </div>

      {/* Write Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <div className="card space-y-4 border-pink-400/10">
              <p className="text-xs text-text-muted">3 things I&apos;m grateful for today:</p>
              {form.items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-accent text-sm font-bold">{i + 1}.</span>
                  <input className="input flex-1" placeholder={`I'm grateful for...`} value={item} onChange={e => {
                    const items = [...form.items]
                    items[i] = e.target.value
                    setForm(f => ({ ...f, items }))
                  }} />
                </div>
              ))}
              <div>
                <label className="text-xs text-text-muted block mb-1">Today&apos;s highlight</label>
                <input className="input w-full" placeholder="What was the best part of today?" value={form.highlight} onChange={e => setForm(f => ({ ...f, highlight: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-text-muted block mb-1.5">How are you feeling?</label>
                <div className="flex gap-2">
                  {MOOD_ICONS.map((_, i) => (
                    <button key={i} onClick={() => setForm(f => ({ ...f, mood: i + 1 }))} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${form.mood === i + 1 ? 'bg-accent/15 scale-110 ring-1 ring-accent/30' : 'bg-bg-elevated hover:bg-bg-hover'}`}>
                      <MoodIcon mood={i + 1} size={20} />
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleSubmit} className="btn w-full">
                {todayEntry ? 'Update' : 'Save'} Gratitude
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's Entry */}
      {todayEntry && !showForm && (
        <div className="card mb-6 border-pink-400/10 bg-gradient-to-br from-bg-surface to-bg-elevated/50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text-muted">{selectedDate === today ? 'Today' : formatDate(selectedDate)}</span>
            <span className="text-lg"><MoodIcon mood={todayEntry.mood || 3} size={20} /></span>
          </div>
          <ul className="space-y-1.5">
            {todayEntry.items.map((item, i) => (
              <li key={i} className="text-xs text-text-primary flex items-start gap-2">
                <Star size={10} className="text-accent shrink-0 mt-0.5" /> {item}
              </li>
            ))}
          </ul>
          {todayEntry.highlight && (
            <p className="text-xs text-accent mt-3 pt-2 border-t border-border flex items-center gap-1"><Sparkles size={10} /> {todayEntry.highlight}</p>
          )}
        </div>
      )}

      {/* Undo bar */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-red-soft/10 border border-red-soft/20">
              <span className="text-xs text-red-soft">Entry will be removed</span>
              <button onClick={() => { clearTimeout(pendingDelete.timer); setPendingDelete(null) }} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium"><Undo2 className="w-3 h-3" /> Undo</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Past Entries */}
      <div className="space-y-2">
        <AnimatePresence>
          {entries.filter(e => e.date !== today && e._id !== pendingDelete?.entry._id).map(entry => (
            <motion.div key={entry._id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="card group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted">{formatDate(entry.date)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm"><MoodIcon mood={entry.mood || 3} size={16} /></span>
                  <button onClick={() => {
                    if (pendingDelete) { clearTimeout(pendingDelete.timer); deleteEntry(pendingDelete.entry._id).catch(() => toast.error('Failed to delete')) }
                    const timer = setTimeout(() => { deleteEntry(entry._id).catch(() => toast.error('Failed to delete')); setPendingDelete(null) }, 3500)
                    setPendingDelete({ entry, timer })
                  }} className="btn-ghost p-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              <ul className="space-y-1">
                {entry.items.map((item, i) => (
                  <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                    <Star size={10} className="text-accent/50 shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
              {entry.highlight && <p className="text-xs text-accent/70 mt-2 flex items-center gap-1"><Sparkles size={10} /> {entry.highlight}</p>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
