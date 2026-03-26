'use client'

import { useEffect, useState, useMemo } from 'react'
import { useGratitudeStore, type GratitudeData } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Plus, Trash2, Sparkles, Sun, Star } from 'lucide-react'
import { MoodIcon, MOOD_ICONS } from '@/lib/icons'

export function GratitudeView() {
  const { entries, isLoading, fetchEntries, saveEntry, deleteEntry } = useGratitudeStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ items: ['', '', ''], highlight: '', mood: 4 })

  useEffect(() => { fetchEntries().catch(() => {}) }, [fetchEntries])

  const today = toISODate()
  const todayEntry = entries.find(e => e.date === today)

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
      date: today,
      items,
      highlight: form.highlight,
      mood: form.mood,
    }).catch(() => {})
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
          <p className="text-text-muted text-xs mt-0.5">What are you grateful for today?</p>
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
          <p className="text-[9px] text-text-muted">Day Streak</p>
        </div>
        <div className="card text-center">
          <Sun className="w-4 h-4 text-pink-400 mx-auto mb-1" />
          <p className="text-2xl font-bold text-pink-400">{stats.total}</p>
          <p className="text-[9px] text-text-muted">Total Entries</p>
        </div>
        <div className="card text-center">
          <Heart className="w-4 h-4 text-green-soft mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-soft">{stats.avgMood}/5</p>
          <p className="text-[9px] text-text-muted">Avg Mood</p>
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
                <label className="text-[10px] text-text-muted block mb-1">Today&apos;s highlight</label>
                <input className="input w-full" placeholder="What was the best part of today?" value={form.highlight} onChange={e => setForm(f => ({ ...f, highlight: e.target.value }))} />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block mb-1.5">How are you feeling?</label>
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
            <span className="text-[10px] text-text-muted">Today</span>
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
            <p className="text-[10px] text-accent mt-3 pt-2 border-t border-border flex items-center gap-1"><Sparkles size={10} /> {todayEntry.highlight}</p>
          )}
        </div>
      )}

      {/* Past Entries */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {entries.filter(e => e.date !== today).map(entry => (
            <motion.div key={entry._id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="card group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-text-muted">{formatDate(entry.date)}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm"><MoodIcon mood={entry.mood || 3} size={16} /></span>
                  <button onClick={() => deleteEntry(entry._id).catch(() => {})} className="btn-ghost p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              <ul className="space-y-1">
                {entry.items.map((item, i) => (
                  <li key={i} className="text-xs text-text-secondary flex items-start gap-2">
                    <Star size={10} className="text-accent/50 shrink-0 mt-0.5" /> {item}
                  </li>
                ))}
              </ul>
              {entry.highlight && <p className="text-[10px] text-accent/70 mt-2 flex items-center gap-1"><Sparkles size={10} /> {entry.highlight}</p>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
