'use client'

import { useEffect, useMemo, useState } from 'react'
import { toISODate, formatDate } from '@/lib/utils'
import { MOTIVATIONAL_QUOTES } from '@/lib/quotes'
import { BarChart3, Flame, BookOpen, Dumbbell, CheckSquare, Target, Moon, Scale, TrendingUp, TrendingDown, Minus, Quote, ChevronLeft, ChevronRight, Calendar, Focus, Folder, DollarSign, Inbox, Clock } from 'lucide-react'
import { fetchApi } from '@/lib/api'

function getWeekDates(offset = 0) {
  const now = new Date()
  now.setDate(now.getDate() + offset * 7)
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(now)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return toISODate(d)
  })
  return { start: dates[0], end: dates[6], dates }
}

export function WeeklyReviewView() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const week = useMemo(() => getWeekDates(weekOffset), [weekOffset])

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchApi(`/api/review/weekly?start=${week.start}&end=${week.end}`)
      .then(res => res.json())
      .then(json => {
        if (active) {
          setData(json)
          setLoading(false)
        }
      })
      .catch(err => {
        console.error(err)
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [week.start, week.end])

  // Quote of the day
  const quote = MOTIVATIONAL_QUOTES[new Date().getDate() % MOTIVATIONAL_QUOTES.length]
  const isCurrentWeek = weekOffset === 0

  if (loading && !data) {
    return <div className="p-8 text-center text-text-muted animate-pulse">Loading review...</div>
  }

  if (!data) {
    return <div className="p-8 text-center text-red-soft">Failed to load weekly review.</div>
  }

  return (
    <div>
      {/* Header + Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-accent" />
            {isCurrentWeek ? 'Weekly Review' : 'Past Review'}
          </h1>
          <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {formatDate(week.start)} – {formatDate(week.end)}
            {isCurrentWeek && <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-medium">This Week</span>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset(w => w - 1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {!isCurrentWeek && (
            <button onClick={() => setWeekOffset(0)}
              className="px-2.5 py-1 text-xs rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors font-medium">
              Today
            </button>
          )}
          <button onClick={() => setWeekOffset(w => Math.min(0, w + 1))}
            disabled={isCurrentWeek}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quote */}
      <div className="card mb-6 border-accent/10 bg-gradient-to-br from-bg-surface to-bg-elevated/50">
        <div className="flex items-start gap-3">
          <Quote className="w-5 h-5 text-accent/50 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-text-primary italic leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
            <p className="text-xs text-text-muted mt-1">— {quote.author}</p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-sm font-medium text-text-primary mb-3">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card text-center">
            <CheckSquare className="w-4 h-4 text-blue-soft mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-soft">{data.tasks?.completed || 0}</p>
            <p className="text-[11px] text-text-secondary">Tasks Completed</p>
          </div>
          <div className="card text-center">
            <Flame className="w-4 h-4 text-accent mx-auto mb-1" />
            <p className="text-2xl font-bold text-accent">{data.habits?.completionRate || 0}%</p>
            <p className="text-[11px] text-text-secondary">Habit Rate</p>
          </div>
          <div className="card text-center">
            <Dumbbell className="w-4 h-4 text-green-soft mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-soft">{data.workouts?.count || 0}</p>
            <p className="text-[11px] text-text-secondary">Workouts</p>
          </div>
          <div className="card text-center">
            <BookOpen className="w-4 h-4 text-purple-soft mx-auto mb-1" />
            <p className="text-2xl font-bold text-purple-soft">{data.journal?.entryCount || 0}</p>
            <p className="text-[11px] text-text-secondary">Journal Entries</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Tasks Breakdown */}
        <div className="card">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-blue-soft" /> Tasks
          </h3>
          <div className="grid grid-cols-3 gap-2 text-center mb-3">
            <div className="p-2 bg-bg-elevated rounded-lg">
              <p className="text-lg font-bold text-text-primary">{data.tasks?.completed || 0}</p>
              <p className="text-[10px] text-text-muted">Completed</p>
            </div>
            <div className="p-2 bg-bg-elevated rounded-lg">
              <p className="text-lg font-bold text-text-primary">{data.tasks?.remaining || 0}</p>
              <p className="text-[10px] text-text-muted">Remaining</p>
            </div>
            <div className="p-2 bg-bg-elevated rounded-lg">
              <p className={`text-lg font-bold ${(data.tasks?.overdue || 0) > 0 ? 'text-red-soft' : 'text-text-primary'}`}>{data.tasks?.overdue || 0}</p>
              <p className="text-[10px] text-text-muted">Overdue</p>
            </div>
          </div>
        </div>

        {/* Goals & Projects */}
        <div className="card">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-accent" /> Focus & Progress
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Target className="w-3.5 h-3.5 text-text-muted" /> Active Goals
              </div>
              <span className="text-sm font-medium">{data.goals?.activeCount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Folder className="w-3.5 h-3.5 text-text-muted" /> Projects Touched
              </div>
              <span className="text-sm font-medium">{data.projects?.touchedCount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3.5 h-3.5 text-text-muted" /> Focus Sessions
              </div>
              <span className="text-sm font-medium">{data.focus?.count || 0} <span className="text-text-muted text-[10px]">({Math.round((data.focus?.totalDuration || 0)/60)}h)</span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expenses */}
        <div className="card">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-green-soft" /> Expenses
          </h3>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-bold text-text-primary">${(data.expenses?.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-[11px] text-text-muted">Total Spent</p>
            </div>
            <div className="pl-4 border-l border-border/50">
              <p className="text-lg font-medium text-text-primary">{data.expenses?.count || 0}</p>
              <p className="text-[11px] text-text-muted">Transactions</p>
            </div>
          </div>
        </div>

        {/* Captures */}
        <div className="card">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5">
            <Inbox className="w-3.5 h-3.5 text-purple-soft" /> Captures
          </h3>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-bg-elevated rounded-lg">
              <p className="text-lg font-bold text-text-primary">{data.captures?.count || 0}</p>
              <p className="text-[10px] text-text-muted">Items Captured</p>
            </div>
            <div className="p-2 bg-bg-elevated rounded-lg">
              <p className="text-lg font-bold text-text-primary">{data.captures?.processedCount || 0}</p>
              <p className="text-[10px] text-text-muted">Processed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
