'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useJournalStore } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { ListSkeleton } from '@/components/Skeletons'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, BookOpen, Search, Calendar, Tag, Smile, Zap, Star, TrendingUp, Heart, FileText, ChevronDown, ChevronUp, Flame, Sparkles, PenLine, Clock, Sun, Moon, Sunset, type LucideIcon } from 'lucide-react'
import { MoodIcon, MOOD_LABELS, MOOD_ICONS, MOOD_COLORS } from '@/lib/icons'
import { toast } from '@/components/Toast'

/* ── Constants ── */
const ENERGY_LABELS = ['Drained', 'Low', 'Moderate', 'High', 'Electric']
const ENERGY_COLORS = ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-emerald-400', 'text-cyan-400']

const PROMPTS = [
  "What made you smile today?",
  "What's one thing you learned today?",
  "If today were a movie scene, what would it be?",
  "What are you most proud of right now?",
  "Write a letter to your future self about today.",
  "What would you do differently if you could restart today?",
  "What challenged you today and how did you handle it?",
  "Describe a moment of peace you experienced today.",
  "What conversation stuck with you today?",
  "What's something small that made a big difference today?",
  "How did you take care of yourself today?",
  "What's one thing you're looking forward to tomorrow?",
  "What assumption did you challenge today?",
  "Describe today in exactly five words.",
  "What would you tell someone who had the same day as you?",
  "What was the most unexpected part of today?",
  "What are you grateful for that you usually overlook?",
  "How did your body feel throughout the day?",
  "What emotion dominated your day and why?",
  "What did you create, build, or contribute today?",
]

const TEMPLATES = [
  { id: 'free', label: 'Free Write', icon: PenLine, description: 'Stream of consciousness' },
  { id: 'morning', label: 'Morning Pages', icon: Sun, description: 'Intentions & mindset' },
  { id: 'evening', label: 'Evening Reflection', icon: Moon, description: 'Review & gratitude' },
  { id: 'gratitude', label: 'Gratitude Focus', icon: Heart, description: '3 things thankful for' },
]

const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365]

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return { label: 'Good morning', icon: Sun, color: 'text-amber-400' }
  if (h < 17) return { label: 'Good afternoon', icon: Sunset, color: 'text-orange-400' }
  return { label: 'Good evening', icon: Moon, color: 'text-indigo-400' }
}

function getDailyPrompt() {
  const day = Math.floor(Date.now() / 86400000)
  return PROMPTS[day % PROMPTS.length]
}

function EnergyIcon({ level, size = 20, className = '' }: { level: number; size?: number; className?: string }) {
  const idx = Math.max(0, Math.min(4, level - 1))
  return <Zap size={size} className={`${ENERGY_COLORS[idx]} ${className}`} style={{ opacity: 0.4 + idx * 0.15 }} />
}

/* ── Step-based Editor ── */
type EditorStep = 'checkin' | 'write' | 'reflect'

export function JournalView() {
  const { entries, isLoading, fetchEntries, saveEntry, deleteEntry } = useJournalStore()
  const [showNew, setShowNew] = useState(false)
  const [activeEntry, setActiveEntry] = useState<string | null>(null)
  const [editorStep, setEditorStep] = useState<EditorStep>('checkin')
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editMood, setEditMood] = useState(0)
  const [editEnergy, setEditEnergy] = useState(0)
  const [editHighlights, setEditHighlights] = useState('')
  const [editGratitude, setEditGratitude] = useState('')
  const [editImprovements, setEditImprovements] = useState('')
  const [editTags, setEditTags] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('free')
  const [searchQuery, setSearchQuery] = useState('')
  const [moodFilter, setMoodFilter] = useState<number | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<string | null>(null)
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)
  const [editDate, setEditDate] = useState(toISODate())
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const [calView, setCalView] = useState<'days' | 'months' | 'years'>('days')
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const yearRangeStart = calMonth.year - 4
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const today = toISODate()
  const timeOfDay = useMemo(() => getTimeOfDay(), [])
  const dailyPrompt = useMemo(() => getDailyPrompt(), [])

  useEffect(() => { fetchEntries().catch(() => toast.error('Failed to load journal entries')) }, [fetchEntries])

  // Auto-save draft in memory (non-persistent)
  const draftRef = useRef<Record<string, unknown> | null>(null)
  const saveDraft = useCallback(() => {
    if (!showNew) return
    draftRef.current = { editTitle, editContent, editMood, editEnergy, editHighlights, editGratitude, editImprovements, editTags }
  }, [showNew, editTitle, editContent, editMood, editEnergy, editHighlights, editGratitude, editImprovements, editTags])

  useEffect(() => {
    if (!showNew) return
    const timer = setTimeout(saveDraft, 2000)
    return () => clearTimeout(timer)
  }, [saveDraft, showNew])

  const startNew = (template = 'free', date?: string) => {
    const targetDate = date || toISODate()
    setEditDate(targetDate)
    // Try to restore draft from memory
    const draft = draftRef.current
    if (draft && !activeEntry) {
      try {
        setEditTitle((draft as any).editTitle || '')
        setEditContent((draft as any).editContent || '')
        setEditMood((draft as any).editMood || 0)
        setEditEnergy((draft as any).editEnergy || 0)
        setEditHighlights((draft as any).editHighlights || '')
        setEditGratitude((draft as any).editGratitude || '')
        setEditImprovements((draft as any).editImprovements || '')
        setEditTags((draft as any).editTags || '')
      } catch { /* ignore */ }
    } else {
      setEditTitle('')
      setEditContent('')
      setEditMood(0)
      setEditEnergy(0)
      setEditHighlights('')
      setEditGratitude('')
      setEditImprovements('')
      setEditTags('')
    }
    setActiveEntry(null)
    setSelectedTemplate(template)
    setEditorStep('checkin')
    setShowNew(true)

    // Pre-fill based on template
    if (template === 'morning' && !draft) {
      setEditContent('Intentions for today:\n- \n\nMindset focus:\n\nOne thing I will accomplish:\n')
    } else if (template === 'evening' && !draft) {
      setEditContent('How did today go:\n\nWhat went well:\n\nWhat could improve:\n')
    } else if (template === 'gratitude' && !draft) {
      setEditGratitude('\n\n')
    }
  }

  const startEdit = (entry: typeof entries[0]) => {
    setActiveEntry(entry._id)
    setEditDate(typeof entry.date === 'string' ? entry.date : toISODate(new Date(entry.date)))
    setEditTitle(entry.title)
    setEditContent(entry.content?.replace(/<[^>]*>/g, '') || '')
    setEditMood(entry.mood)
    setEditEnergy(entry.energy || 3)
    setEditHighlights(entry.highlights || '')
    setEditGratitude(entry.gratitude?.join('\n') || '')
    setEditImprovements(entry.improvements || '')
    setEditTags(entry.tags?.join(', ') || '')
    setEditorStep('write')
    setShowNew(true)
  }

  const handleSave = async () => {
    const tags = editTags.split(',').map((t) => t.trim()).filter(Boolean)
    const gratitude = editGratitude.split('\n').map(g => g.trim()).filter(Boolean)
    const data: Record<string, unknown> = {
      date: editDate,
      title: editTitle || `Journal — ${formatDate(editDate)}`,
      content: `<p>${editContent.split('\n').join('</p><p>')}</p>`,
      mood: editMood || 3,
      energy: editEnergy || 3,
      highlights: editHighlights,
      gratitude,
      improvements: editImprovements,
      tags,
    }
    if (activeEntry) data._id = activeEntry
    await saveEntry(data).catch(() => toast.error('Failed to save journal entry'))
    draftRef.current = null
    setShowNew(false)
    setActiveEntry(null)
  }

  // All unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    entries.forEach(e => e.tags?.forEach((t: string) => tags.add(t)))
    return Array.from(tags).sort()
  }, [entries])

  // Stats
  const avgMood = entries.length > 0 ? (entries.reduce((s, e) => s + e.mood, 0) / entries.length).toFixed(1) : '—'
  const avgEnergy = entries.length > 0 ? (entries.reduce((s, e) => s + (e.energy || 3), 0) / entries.length).toFixed(1) : '—'
  const totalWords = entries.reduce((s, e) => s + (e.content?.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length || 0), 0)

  // Calendar grid for date picker
  const calendarGrid = useMemo(() => {
    const { year, month } = calMonth
    const first = new Date(year, month, 1)
    const startDay = first.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const weeks: (string | null)[][] = []
    let week: (string | null)[] = Array(startDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      week.push(ds)
      if (week.length === 7) { weeks.push(week); week = [] }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week) }
    return weeks
  }, [calMonth])

  const entryDateSet = useMemo(() => {
    const s = new Set<string>()
    entries.forEach(e => { const d = typeof e.date === 'string' ? e.date : toISODate(new Date(e.date)); s.add(d) })
    return s
  }, [entries])

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      if (dateFilter) {
        const d = typeof e.date === 'string' ? e.date : toISODate(new Date(e.date))
        if (d !== dateFilter) return false
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matches = (e.title?.toLowerCase().includes(q)) ||
          (e.content?.toLowerCase().includes(q)) ||
          (e.highlights?.toLowerCase().includes(q)) ||
          (e.improvements?.toLowerCase().includes(q)) ||
          (e.gratitude?.some(g => g.toLowerCase().includes(q))) ||
          (e.tags?.some((t: string) => t.toLowerCase().includes(q)))
        if (!matches) return false
      }
      if (moodFilter && e.mood !== moodFilter) return false
      if (tagFilter && !e.tags?.includes(tagFilter)) return false
      return true
    })
  }, [entries, searchQuery, moodFilter, tagFilter, dateFilter])

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

  const nextMilestone = STREAK_MILESTONES.find(m => m > journalStreak) || journalStreak + 1
  const milestoneProgress = journalStreak / nextMilestone

  // 7-day trend
  const moodTrend = useMemo(() => {
    const days: { date: string; mood: number; energy: number; label: string }[] = []
    const d = new Date()
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(d)
      dt.setDate(dt.getDate() - i)
      const ds = toISODate(dt)
      const entry = entries.find(e => (typeof e.date === 'string' ? e.date : toISODate(new Date(e.date))) === ds)
      days.push({ date: ds, mood: entry?.mood || 0, energy: entry?.energy || 0, label: dayNames[dt.getDay()] })
    }
    return days
  }, [entries])

  // GitHub-style heatmap (last 20 weeks, columns = weeks, rows = days)
  const calendarData = useMemo(() => {
    const weeks: { date: string; hasEntry: boolean; mood: number }[][] = []
    const d = new Date()
    d.setDate(d.getDate() - (d.getDay() + 7 * 19))
    for (let w = 0; w < 20; w++) {
      const week: typeof weeks[0] = []
      for (let day = 0; day < 7; day++) {
        const ds = toISODate(d)
        const entry = entries.find(e => (typeof e.date === 'string' ? e.date : toISODate(new Date(e.date))) === ds)
        week.push({ date: ds, hasEntry: !!entry, mood: entry?.mood || 0 })
        d.setDate(d.getDate() + 1)
      }
      weeks.push(week)
    }
    return weeks
  }, [entries])

  const wordCount = editContent.split(/\s+/).filter(Boolean).length

  const TimeIcon = timeOfDay.icon

  return (
    <div>
      {/* ───── Header with greeting ───── */}
      {!showNew && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TimeIcon className={`w-5 h-5 ${timeOfDay.color}`} />
                <h1 className="text-2xl font-semibold tracking-tight">{timeOfDay.label}</h1>
              </div>
              <p className="text-text-muted text-sm">{entries.length} entries · {totalWords.toLocaleString()} words written</p>
            </div>
            <button onClick={() => startNew()} className="btn flex items-center gap-2"><Plus className="w-4 h-4" /> New Entry</button>
          </div>

          {/* ── Streak Banner ── */}
          <div className="mt-5 card !p-4 border-accent/20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                  <Flame className={`w-7 h-7 ${journalStreak > 0 ? 'text-orange-400' : 'text-text-muted'}`} />
                </div>
                {journalStreak >= 7 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-[11px] font-bold text-[#1a1a1a] flex items-center justify-center">
                    {journalStreak}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-text-primary">{journalStreak} day streak</span>
                  {todaysEntry && <span className="text-xs text-emerald-400 font-medium">Today done</span>}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-orange-400 to-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${milestoneProgress * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  <span className="text-xs text-text-muted shrink-0">{journalStreak}/{nextMilestone}d</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ───── Today's Prompt Card ───── */}
      {!todaysEntry && !showNew && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="card border-accent/20 !p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Today&apos;s prompt</p>
                <p className="text-sm text-text-primary font-medium italic leading-relaxed">&ldquo;{dailyPrompt}&rdquo;</p>
                <div className="flex gap-2 mt-3">
                  {TEMPLATES.map(t => {
                    const Icon = t.icon
                    return (
                      <button key={t.id} onClick={() => startNew(t.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-elevated hover:bg-bg-hover text-xs text-text-secondary hover:text-text-primary transition-colors">
                        <Icon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ───── Stats Row ───── */}
      {!showNew && (
        <div className="grid grid-cols-4 md:grid-cols-4 gap-3 mb-6">
          <div className="card !p-3">
            <div className="flex items-center gap-2">
              <Smile className="w-4 h-4 text-accent shrink-0" />
              <div>
                <p className="text-base font-bold text-text-primary leading-none">{avgMood}</p>
                <p className="text-[11px] text-text-muted mt-0.5">Avg mood</p>
              </div>
            </div>
          </div>
          <div className="card !p-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <p className="text-base font-bold text-text-primary leading-none">{avgEnergy}</p>
                <p className="text-[11px] text-text-muted mt-0.5">Avg energy</p>
              </div>
            </div>
          </div>
          <div className="card !p-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-soft shrink-0" />
              <div>
                <p className="text-base font-bold text-text-primary leading-none">{totalWords >= 1000 ? `${(totalWords / 1000).toFixed(1)}k` : totalWords}</p>
                <p className="text-[11px] text-text-muted mt-0.5">Words</p>
              </div>
            </div>
          </div>
          <div className="card !p-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-purple-soft shrink-0" />
              <div>
                <p className="text-base font-bold text-text-primary leading-none">{allTags.length}</p>
                <p className="text-[11px] text-text-muted mt-0.5">Tags</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───── 7-Day Trend ───── */}
      {!showNew && entries.length > 0 && (
        <div className="card !p-4 mb-6">
          <p className="text-xs text-text-muted uppercase tracking-widest mb-3">This week</p>
          <div className="flex gap-2">
            {moodTrend.map((d, i) => {
              const isToday = d.date === today
              const dayEntry = entries.find(e => (typeof e.date === 'string' ? e.date : toISODate(new Date(e.date))) === d.date)
              const isSelected = dateFilter === d.date
              return (
                <div
                  key={i}
                  onClick={() => {
                    if (dayEntry) {
                      setDateFilter(isSelected ? null : d.date)
                      setExpandedEntry(isSelected ? null : dayEntry._id)
                    }
                  }}
                  className={`flex-1 text-center rounded-xl p-2 transition-colors ${dayEntry ? 'cursor-pointer hover:bg-accent/5' : ''} ${isSelected ? 'bg-accent/10 ring-1 ring-accent/30' : isToday ? 'bg-accent/10 ring-1 ring-accent/30' : ''}`}
                >
                  <p className={`text-[11px] mb-1.5 ${isToday ? 'text-accent font-semibold' : 'text-text-muted'}`}>{d.label}</p>
                  <div className="flex flex-col items-center gap-1">
                    {d.mood > 0 ? (
                      <>
                        <MoodIcon mood={d.mood} size={18} />
                        <EnergyIcon level={d.energy} size={12} />
                      </>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-dashed border-border-subtle" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ───── GitHub-style Heatmap + Calendar Picker ───── */}
      {!showNew && entries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-[1fr,220px] gap-3 mb-6">
          {/* Heatmap — compact GitHub-style */}
          <div className="card !p-3 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-text-muted uppercase tracking-widest">Writing activity</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">Less</span>
                <div className="flex gap-[2px]">
                  <div className="w-[9px] h-[9px] rounded-[2px] bg-bg-elevated/60" />
                  <div className="w-[9px] h-[9px] rounded-[2px] bg-orange-400/50" />
                  <div className="w-[9px] h-[9px] rounded-[2px] bg-accent/50" />
                  <div className="w-[9px] h-[9px] rounded-[2px] bg-emerald-500/70" />
                </div>
                <span className="text-xs text-text-muted">More</span>
              </div>
            </div>
            <div className="flex gap-[3px] w-full">
              {/* Day labels */}
              <div className="flex flex-col gap-[3px] mr-[2px]">
                {['', 'M', '', 'W', '', 'F', ''].map((l, i) => (
                  <div key={i} className="aspect-square flex items-center justify-center">
                    <span className="text-[11px] text-text-muted leading-none">{l}</span>
                  </div>
                ))}
              </div>
              {calendarData.map((week, wi) => (
                <div key={wi} className="flex-1 flex flex-col gap-[3px]">
                  {week.map((day, di) => {
                    const moodColor = day.mood >= 4 ? 'bg-emerald-500/70' : day.mood === 3 ? 'bg-accent/50' : day.mood > 0 ? 'bg-orange-400/50' : ''
                    const isSelected = dateFilter === day.date
                    return (
                      <div
                        key={di}
                        onClick={() => setDateFilter(dateFilter === day.date ? null : day.date)}
                        className={`aspect-square rounded-[2px] cursor-pointer transition-all ${
                          day.hasEntry ? moodColor : 'bg-bg-elevated/60'
                        } ${isSelected ? 'ring-1 ring-accent scale-110' : 'hover:ring-1 hover:ring-border'}`}
                        title={`${day.date}${day.hasEntry ? ` — ${MOOD_LABELS[day.mood - 1]}` : ''}`}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Calendar Date Picker */}
          <div className="card !p-3">
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => {
                if (calView === 'days') setCalMonth(p => { const m = p.month - 1; return m < 0 ? { year: p.year - 1, month: 11 } : { ...p, month: m } })
                else if (calView === 'months') setCalMonth(p => ({ ...p, year: p.year - 1 }))
                else setCalMonth(p => ({ ...p, year: p.year - 9 }))
              }}
                className="text-text-muted hover:text-text-primary p-0.5"><ChevronUp className="w-3 h-3 rotate-[-90deg]" /></button>
              <button onClick={() => setCalView(v => v === 'days' ? 'months' : v === 'months' ? 'years' : 'years')}
                className="text-[11px] font-medium text-text-primary hover:text-accent transition-colors px-1 py-0.5 rounded-md hover:bg-bg-hover cursor-pointer">
                {calView === 'years' ? `${yearRangeStart} – ${yearRangeStart + 8}` :
                 calView === 'months' ? `${calMonth.year}` :
                 new Date(calMonth.year, calMonth.month).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </button>
              <button onClick={() => {
                if (calView === 'days') setCalMonth(p => { const m = p.month + 1; return m > 11 ? { year: p.year + 1, month: 0 } : { ...p, month: m } })
                else if (calView === 'months') setCalMonth(p => ({ ...p, year: p.year + 1 }))
                else setCalMonth(p => ({ ...p, year: p.year + 9 }))
              }}
                className="text-text-muted hover:text-text-primary p-0.5"><ChevronUp className="w-3 h-3 rotate-90" /></button>
            </div>

            <AnimatePresence mode="wait">
            {/* Year picker */}
            {calView === 'years' && (
              <motion.div key="years" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}>
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 9 }, (_, i) => yearRangeStart + i).map(y => (
                  <button key={y} onClick={() => { setCalMonth(p => ({ ...p, year: y })); setCalView('months') }}
                    className={`py-1.5 rounded-md text-[11px] font-medium transition-all ${
                      y === new Date().getFullYear() ? 'ring-1 ring-accent/50 text-accent' :
                      'text-text-muted hover:bg-bg-hover hover:text-text-primary'
                    }`}>{y}</button>
                ))}
              </div>
              </motion.div>
            )}

            {/* Month picker */}
            {calView === 'months' && (
              <motion.div key="months" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}>
              <div className="grid grid-cols-3 gap-1">
                {MONTHS_SHORT.map((m, i) => {
                  const isCurrent = calMonth.year === new Date().getFullYear() && i === new Date().getMonth()
                  return (
                    <button key={m} onClick={() => { setCalMonth(p => ({ ...p, month: i })); setCalView('days') }}
                      className={`py-1.5 rounded-md text-[11px] font-medium transition-all ${
                        isCurrent ? 'ring-1 ring-accent/50 text-accent' :
                        i === calMonth.month ? 'bg-accent/15 text-accent' :
                        'text-text-muted hover:bg-bg-hover hover:text-text-primary'
                      }`}>{m}</button>
                  )
                })}
              </div>
              </motion.div>
            )}

            {/* Day picker */}
            {calView === 'days' && (
              <motion.div key="days" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}>
            <div className="grid grid-cols-7 gap-[2px]">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="h-5 flex items-center justify-center">
                  <span className="text-xs text-text-muted font-medium">{d}</span>
                </div>
              ))}
              {calendarGrid.flat().map((ds, i) => {
                if (!ds) return <div key={i} className="h-6" />
                const hasEntry = entryDateSet.has(ds)
                const isSelected = dateFilter === ds
                const isToday = ds === today
                return (
                  <button
                    key={i}
                    onClick={() => setDateFilter(dateFilter === ds ? null : ds)}
                    className={`h-6 rounded-md text-xs relative transition-all ${
                      isSelected ? 'bg-accent text-[#1a1a1a] font-bold' :
                      isToday ? 'ring-1 ring-accent/50 text-accent font-semibold' :
                      hasEntry ? 'text-text-primary font-medium hover:bg-bg-hover' :
                      'text-text-muted hover:bg-bg-hover'
                    }`}
                  >
                    {parseInt(ds.split('-')[2])}
                    {hasEntry && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                    )}
                  </button>
                )
              })}
            </div>
            </motion.div>)}
            </AnimatePresence>
            {dateFilter && (
              <button onClick={() => setDateFilter(null)} className="w-full mt-2 text-xs text-accent hover:text-accent/80 py-1">
                Clear date filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* ───── STEP-BASED EDITOR ───── */}
      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mb-6">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              {(['checkin', 'write', 'reflect'] as const).map((step, i) => {
                const labels = ['Check In', 'Write', 'Reflect']
                const icons = [Smile, PenLine, Heart]
                const Icon = icons[i]
                const active = step === editorStep
                const done = (['checkin', 'write', 'reflect'] as const).indexOf(editorStep) > i
                return (
                  <button key={step} onClick={() => setEditorStep(step)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      active ? 'bg-accent/15 text-accent' : done ? 'text-emerald-400' : 'text-text-muted hover:text-text-primary'
                    }`}>
                    <Icon className="w-3.5 h-3.5" />
                    {labels[i]}
                    {done && <span className="text-xs">✓</span>}
                  </button>
                )
              })}
              <div className="flex-1" />
              <button onClick={() => setShowNew(false)} className="text-text-muted hover:text-text-primary p-1"><X className="w-4 h-4" /></button>
            </div>

            <div className="card border-accent/20">
              {/* ─ Step 1: Check In ─ */}
              {editorStep === 'checkin' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                  <div className="text-center pb-2">
                    <h3 className="text-lg font-semibold text-text-primary">How are you right now?</h3>
                    <p className="text-xs text-text-muted mt-1">Take a breath. Tune in.</p>
                  </div>

                  {/* Mood */}
                  <div>
                    <p className="text-xs text-text-muted mb-3 text-center">Mood</p>
                    <div className="flex items-center justify-center gap-3">
                      {MOOD_ICONS.map((_, i) => (
                        <button key={i} onClick={() => setEditMood(i + 1)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${
                            editMood === i + 1 ? 'bg-accent/15 scale-110 ring-2 ring-accent/30' : 'opacity-40 hover:opacity-80 hover:scale-105'
                          }`}>
                          <MoodIcon mood={i + 1} size={32} />
                          <span className={`text-xs font-medium ${editMood === i + 1 ? 'text-accent' : 'text-text-muted'}`}>{MOOD_LABELS[i]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Energy */}
                  <div>
                    <p className="text-xs text-text-muted mb-3 text-center">Energy</p>
                    <div className="flex items-center justify-center gap-3">
                      {ENERGY_LABELS.map((label, i) => (
                        <button key={i} onClick={() => setEditEnergy(i + 1)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all ${
                            editEnergy === i + 1 ? 'bg-cyan-400/10 scale-110 ring-2 ring-cyan-400/30' : 'opacity-40 hover:opacity-80 hover:scale-105'
                          }`}>
                          <EnergyIcon level={i + 1} size={32} />
                          <span className={`text-xs font-medium ${editEnergy === i + 1 ? 'text-cyan-400' : 'text-text-muted'}`}>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => { setEditorStep('write'); setTimeout(() => contentRef.current?.focus(), 200) }}
                      disabled={!editMood || !editEnergy}
                      className={`btn px-6 ${!editMood || !editEnergy ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      Continue
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ─ Step 2: Write ─ */}
              {editorStep === 'write' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {/* Mood/energy summary pill */}
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setEditorStep('checkin')} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-bg-elevated text-xs text-text-muted hover:text-text-primary transition-colors">
                      <MoodIcon mood={editMood || 3} size={14} /> {MOOD_LABELS[(editMood || 3) - 1]}
                      <span className="text-border">·</span>
                      <EnergyIcon level={editEnergy || 3} size={14} /> {ENERGY_LABELS[(editEnergy || 3) - 1]}
                    </button>
                    <div className="flex-1" />
                    <span className="text-xs text-text-muted">{formatDate(today)}</span>
                  </div>

                  {/* Prompt hint */}
                  <div className="bg-bg-elevated rounded-lg px-3 py-2 border border-border-subtle">
                    <p className="text-xs text-accent/70 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Prompt: {dailyPrompt}</p>
                  </div>

                  {/* Title */}
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title this entry..."
                    className="w-full bg-transparent text-xl font-semibold text-text-primary placeholder:text-text-muted outline-none border-none" />

                  {/* Main writing area */}
                  <div className="relative">
                    <textarea
                      ref={contentRef}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Start writing..."
                      className="w-full bg-transparent text-text-primary text-sm leading-[1.8] resize-none outline-none min-h-[250px] placeholder:text-text-muted"
                    />
                    {/* Word count bar */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-text-muted">{wordCount} words</span>
                        {wordCount > 0 && (
                          <span className="text-xs text-text-muted">~{Math.ceil(wordCount / 200)} min read</span>
                        )}
                      </div>
                      <span className="text-xs text-emerald-400/70">Auto-saving draft</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setEditorStep('checkin')} className="btn-ghost text-xs">Back</button>
                    <div className="flex-1" />
                    <button onClick={() => setEditorStep('reflect')} className="btn px-6 text-xs">Continue to Reflect</button>
                  </div>
                </motion.div>
              )}

              {/* ─ Step 3: Reflect ─ */}
              {editorStep === 'reflect' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="text-center pb-1">
                    <h3 className="text-sm font-semibold text-text-primary">Wrap up your day</h3>
                    <p className="text-xs text-text-muted mt-0.5">These are optional — fill what feels right</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-text-muted mb-1.5 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-400" /> Highlights</label>
                      <textarea value={editHighlights} onChange={(e) => setEditHighlights(e.target.value)}
                        placeholder="Best moments today..."
                        className="w-full bg-bg-elevated border border-border rounded-lg p-3 text-sm text-text-primary placeholder:text-text-muted outline-none resize-none min-h-[90px] focus:border-accent-muted transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1.5 flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-400" /> Gratitude</label>
                      <textarea value={editGratitude} onChange={(e) => setEditGratitude(e.target.value)}
                        placeholder="One thing per line..."
                        className="w-full bg-bg-elevated border border-border rounded-lg p-3 text-sm text-text-primary placeholder:text-text-muted outline-none resize-none min-h-[90px] focus:border-accent-muted transition-colors" />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1.5 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-blue-soft" /> To improve</label>
                      <textarea value={editImprovements} onChange={(e) => setEditImprovements(e.target.value)}
                        placeholder="What could be better..."
                        className="w-full bg-bg-elevated border border-border rounded-lg p-3 text-sm text-text-primary placeholder:text-text-muted outline-none resize-none min-h-[90px] focus:border-accent-muted transition-colors" />
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    <input type="text" value={editTags} onChange={(e) => setEditTags(e.target.value)}
                      placeholder="Tags (comma separated)" className="input flex-1 text-xs" />
                  </div>

                  {/* Summary before save */}
                  <div className="bg-bg-elevated rounded-xl p-3 border border-border-subtle">
                    <p className="text-xs text-text-muted mb-2">Entry summary</p>
                    <div className="flex items-center gap-3 text-xs text-text-secondary">
                      <span className="flex items-center gap-1"><MoodIcon mood={editMood || 3} size={14} /> {MOOD_LABELS[(editMood || 3) - 1]}</span>
                      <span className="flex items-center gap-1"><EnergyIcon level={editEnergy || 3} size={14} /> {ENERGY_LABELS[(editEnergy || 3) - 1]}</span>
                      <span>{wordCount} words</span>
                      {editGratitude.split('\n').filter(g => g.trim()).length > 0 && (
                        <span>{editGratitude.split('\n').filter(g => g.trim()).length} gratitudes</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setEditorStep('write')} className="btn-ghost text-xs">Back</button>
                    <button onClick={handleSave} className="btn flex-1">Save Entry</button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───── Search & Filters ───── */}
      {!showNew && (
        <>
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search entries..."
                className="input pl-10" />
            </div>
            <div className="flex items-center gap-1 bg-bg-surface border border-border rounded-lg p-1">
              {MOOD_ICONS.map((_, i) => (
                <button key={i} onClick={() => setMoodFilter(moodFilter === i + 1 ? null : i + 1)}
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${
                    moodFilter === i + 1 ? 'bg-accent/20 scale-110' : 'opacity-50 hover:opacity-100'
                  }`}><MoodIcon mood={i + 1} size={16} /></button>
              ))}
            </div>
          </div>

          {/* Active filters */}
          {dateFilter && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-text-muted">Showing:</span>
              <button onClick={() => setDateFilter(null)} className="badge bg-accent/20 text-accent text-xs flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" /> {formatDate(dateFilter)} <span className="ml-0.5">✕</span>
              </button>
            </div>
          )}

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {tagFilter && (
                <button onClick={() => setTagFilter(null)} className="badge bg-accent/20 text-accent text-xs">✕ Clear</button>
              )}
              {allTags.map(tag => (
                <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  className={`badge text-xs transition-all ${tagFilter === tag ? 'bg-accent/20 text-accent' : 'hover:bg-bg-hover'}`}>#{tag}</button>
              ))}
            </div>
          )}
        </>
      )}

      {/* ───── Entries Timeline ───── */}
      {!showNew && (
        <>
          {isLoading ? (
            <ListSkeleton rows={4} />
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-16 card">
              <BookOpen className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-50" />
              <p className="text-sm text-text-muted">{searchQuery || moodFilter || tagFilter || dateFilter ? 'No matching entries' : 'Your journal is empty'}</p>
              {!searchQuery && !moodFilter && !dateFilter && <p className="text-xs text-text-muted mt-1">Start documenting your journey</p>}
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[23px] top-0 bottom-0 w-px bg-border-subtle hidden md:block" />

              <div className="space-y-3">
                {filteredEntries.map((entry, idx) => {
                  const plainContent = entry.content?.replace(/<[^>]*>/g, '') || ''
                  const entryWordCount = plainContent.split(/\s+/).filter(Boolean).length
                  const isExpanded = expandedEntry === entry._id
                  const hasExtras = entry.highlights || (entry.gratitude?.length > 0) || entry.improvements
                  const entryDate = typeof entry.date === 'string' ? entry.date : toISODate(new Date(entry.date))
                  const isToday = entryDate === today

                  // Show date separator
                  const prevEntry = filteredEntries[idx - 1]
                  const prevDate = prevEntry ? (typeof prevEntry.date === 'string' ? prevEntry.date : toISODate(new Date(prevEntry.date))) : null
                  const showDateHeader = idx === 0 || entryDate !== prevDate

                  return (
                    <div key={entry._id}>
                      {showDateHeader && (
                        <div className="flex items-center gap-3 mb-2 mt-4 first:mt-0">
                          <div className="hidden md:flex w-[47px] justify-center">
                            <div className={`w-2.5 h-2.5 rounded-full ${isToday ? 'bg-accent' : 'bg-border'}`} />
                          </div>
                          <span className={`text-xs font-semibold ${isToday ? 'text-accent' : 'text-text-muted'}`}>
                            {isToday ? 'Today' : formatDate(entryDate)}
                          </span>
                        </div>
                      )}

                      <motion.div layout className="card group transition-all md:ml-[47px]">
                        <div className="flex items-start gap-3 cursor-pointer" onClick={() => startEdit(entry)}>
                          <div className="shrink-0 flex flex-col items-center gap-0.5">
                            <MoodIcon mood={entry.mood || 3} size={22} />
                            <EnergyIcon level={entry.energy || 3} size={12} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="text-sm font-medium text-text-primary truncate">{entry.title || 'Untitled'}</h3>
                              <span className="text-xs text-text-muted shrink-0">{entryWordCount}w</span>
                            </div>
                            <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">{plainContent.slice(0, 250)}</p>
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              {entry.tags?.map((tag: string) => <span key={tag} className="badge text-[11px]">#{tag}</span>)}
                              {entry.highlights && <span className="text-[11px] text-yellow-400/70 flex items-center gap-0.5"><Star className="w-2.5 h-2.5" /> highlights</span>}
                              {entry.gratitude?.length > 0 && <span className="text-[11px] text-rose-400/70 flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" /> {entry.gratitude.length} gratitudes</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-center gap-1 shrink-0">
                            <button onClick={(e) => { e.stopPropagation(); deleteEntry(entry._id) }}
                              className="text-text-muted hover:text-red-soft transition-all p-1 md:opacity-0 md:group-hover:opacity-100">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {hasExtras && (
                              <button onClick={(e) => { e.stopPropagation(); setExpandedEntry(isExpanded ? null : entry._id) }}
                                className="text-text-muted hover:text-text-primary p-1 transition-colors">
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expandable details */}
                        <AnimatePresence>
                          {isExpanded && hasExtras && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-border-subtle">
                                {entry.highlights && (
                                  <div className="bg-bg-elevated rounded-lg p-3">
                                    <p className="text-xs text-text-muted flex items-center gap-1 mb-1.5"><Star className="w-3 h-3 text-yellow-400" /> Highlights</p>
                                    <p className="text-xs text-text-secondary leading-relaxed">{entry.highlights}</p>
                                  </div>
                                )}
                                {entry.gratitude?.length > 0 && (
                                  <div className="bg-bg-elevated rounded-lg p-3">
                                    <p className="text-xs text-text-muted flex items-center gap-1 mb-1.5"><Heart className="w-3 h-3 text-rose-400" /> Gratitude</p>
                                    <ul className="space-y-1">
                                      {entry.gratitude.map((g: string, gi: number) => (
                                        <li key={gi} className="text-xs text-text-secondary flex items-start gap-1.5">
                                          <span className="text-rose-400 mt-0.5">·</span> {g}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {entry.improvements && (
                                  <div className="bg-bg-elevated rounded-lg p-3">
                                    <p className="text-xs text-text-muted flex items-center gap-1 mb-1.5"><TrendingUp className="w-3 h-3 text-blue-soft" /> To Improve</p>
                                    <p className="text-xs text-text-secondary leading-relaxed">{entry.improvements}</p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
