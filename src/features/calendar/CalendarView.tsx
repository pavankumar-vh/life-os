'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTimelineStore, useHabitsStore, useJournalStore, useWorkoutsStore, useMealsStore, useTasksStore, useGoalsStore, type TimelineEvent } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Flame, BookOpen, Dumbbell, Apple, CheckSquare, Target, Activity, Clock, TrendingUp } from 'lucide-react'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const TYPE_CONFIG: Record<string, { icon: typeof Flame; color: string; bg: string; label: string }> = {
  habit: { icon: Flame, color: 'text-purple-soft', bg: 'bg-purple-soft/10', label: 'Habits' },
  journal: { icon: BookOpen, color: 'text-accent', bg: 'bg-accent/10', label: 'Journal' },
  workout: { icon: Dumbbell, color: 'text-green-soft', bg: 'bg-green-soft/10', label: 'Workouts' },
  meal: { icon: Apple, color: 'text-orange-soft', bg: 'bg-orange-soft/10', label: 'Meals' },
  task: { icon: CheckSquare, color: 'text-blue-soft', bg: 'bg-blue-soft/10', label: 'Tasks' },
  goal: { icon: Target, color: 'text-accent', bg: 'bg-accent/10', label: 'Goals' },
}

const TYPE_FILTERS = ['all', 'habit', 'journal', 'workout', 'meal', 'task', 'goal']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // Monday-first
}

export function CalendarView() {
  const { events, isLoading, fetchTimeline } = useTimelineStore()
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(toISODate())
  const [typeFilter, setTypeFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('calendar')
  const today = toISODate()

  const fetchData = useCallback(() => {
    const from = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`
    const lastDay = getDaysInMonth(currentYear, currentMonth)
    const to = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    fetchTimeline(from, to).catch(() => {})
  }, [currentYear, currentMonth, fetchTimeline])

  useEffect(() => { fetchData() }, [fetchData])

  const navigateMonth = (offset: number) => {
    let m = currentMonth + offset
    let y = currentYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setCurrentMonth(m)
    setCurrentYear(y)
  }

  const goToToday = () => {
    const now = new Date()
    setCurrentYear(now.getFullYear())
    setCurrentMonth(now.getMonth())
    setSelectedDate(today)
  }

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map: Record<string, TimelineEvent[]> = {}
    for (const e of events) {
      if (typeFilter !== 'all' && e.type !== typeFilter) continue
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    }
    return map
  }, [events, typeFilter])

  // Calendar grid
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
    const days: Array<{ day: number; date: string; isCurrentMonth: boolean }> = []

    // Previous month padding
    const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1)
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      const m = currentMonth === 0 ? 12 : currentMonth
      const y = currentMonth === 0 ? currentYear - 1 : currentYear
      days.push({ day: d, date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, isCurrentMonth: false })
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: true,
      })
    }

    // Next month padding
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth + 2 > 12 ? 1 : currentMonth + 2
      const y = currentMonth + 2 > 12 ? currentYear + 1 : currentYear
      days.push({ day: d, date: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, isCurrentMonth: false })
    }

    return days
  }, [currentYear, currentMonth])

  // Selected day events
  const selectedEvents = useMemo(() => {
    if (!selectedDate) return []
    return (eventsByDate[selectedDate] || [])
  }, [selectedDate, eventsByDate])

  // Monthly stats
  const monthStats = useMemo(() => {
    const types: Record<string, number> = {}
    for (const evts of Object.values(eventsByDate)) {
      for (const e of evts) {
        types[e.type] = (types[e.type] || 0) + 1
      }
    }
    const activeDays = Object.keys(eventsByDate).length
    return { types, activeDays, total: events.filter(e => typeFilter === 'all' || e.type === typeFilter).length }
  }, [eventsByDate, events, typeFilter])

  // Streak calculation
  const currentStreak = useMemo(() => {
    let streak = 0
    const d = new Date()
    while (true) {
      const key = toISODate(d)
      if (eventsByDate[key] && eventsByDate[key].length > 0) {
        streak++
        d.setDate(d.getDate() - 1)
      } else {
        break
      }
    }
    return streak
  }, [eventsByDate])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <CalIcon className="w-6 h-6 text-accent" /> Calendar
          </h1>
          <p className="text-text-muted text-xs mt-0.5">Your life, day by day</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-bg-elevated rounded-lg p-0.5">
            <button onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === 'calendar' ? 'bg-bg-surface text-accent font-medium' : 'text-text-muted'}`}>Calendar</button>
            <button onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === 'timeline' ? 'bg-bg-surface text-accent font-medium' : 'text-text-muted'}`}>Timeline</button>
          </div>
        </div>
      </div>

      {/* Month Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card text-center">
          <Activity className="w-4 h-4 text-accent mx-auto mb-1" />
          <p className="text-xl font-bold text-accent">{monthStats.total}</p>
          <p className="text-[10px] text-text-muted">Events this month</p>
        </div>
        <div className="card text-center">
          <CalIcon className="w-4 h-4 text-green-soft mx-auto mb-1" />
          <p className="text-xl font-bold text-green-soft">{monthStats.activeDays}</p>
          <p className="text-[10px] text-text-muted">Active days</p>
        </div>
        <div className="card text-center">
          <TrendingUp className="w-4 h-4 text-orange-soft mx-auto mb-1" />
          <p className="text-xl font-bold text-orange-soft">{currentStreak}</p>
          <p className="text-[10px] text-text-muted">Day streak</p>
        </div>
        <div className="card text-center">
          <Clock className="w-4 h-4 text-blue-soft mx-auto mb-1" />
          <p className="text-xl font-bold text-blue-soft">{getDaysInMonth(currentYear, currentMonth)}</p>
          <p className="text-[10px] text-text-muted">Days in month</p>
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {TYPE_FILTERS.map(t => {
          const config = t !== 'all' ? TYPE_CONFIG[t] : null
          return (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all flex items-center gap-1.5 capitalize ${
                typeFilter === t ? 'bg-accent/15 text-accent font-medium' : 'bg-bg-elevated text-text-muted hover:text-text-primary hover:bg-bg-hover'
              }`}>
              {config && <config.icon className="w-3 h-3" />}
              {t === 'all' ? 'All' : config?.label}
              {t !== 'all' && monthStats.types[t] ? <span className="text-[9px] opacity-70">({monthStats.types[t]})</span> : null}
            </button>
          )
        })}
      </div>

      {viewMode === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Calendar Grid */}
          <div className="card">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => navigateMonth(-1)} className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors">
                <ChevronLeft className="w-4 h-4 text-text-muted" />
              </button>
              <div className="text-center">
                <h2 className="text-sm font-semibold">{MONTHS[currentMonth]} {currentYear}</h2>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={goToToday} className="text-[10px] text-accent hover:underline mr-2">Today</button>
                <button onClick={() => navigateMonth(1)} className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors">
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-[10px] text-text-muted font-medium py-1">{d}</div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((day, i) => {
                const dayEvents = eventsByDate[day.date] || []
                const isToday = day.date === today
                const isSelected = day.date === selectedDate
                const hasEvents = dayEvents.length > 0

                // Get unique types for dots
                const uniqueTypes = [...new Set(dayEvents.map(e => e.type))]

                return (
                  <button key={i} onClick={() => setSelectedDate(day.date)}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all ${
                      !day.isCurrentMonth ? 'text-text-muted/30' :
                      isSelected ? 'bg-accent/15 text-accent font-semibold ring-1 ring-accent/30' :
                      isToday ? 'bg-bg-hover text-accent font-medium' :
                      hasEvents ? 'text-text-primary hover:bg-bg-hover' :
                      'text-text-secondary hover:bg-bg-hover/50'
                    }`}>
                    <span className="text-[13px]">{day.day}</span>
                    {/* Event dots */}
                    {hasEvents && day.isCurrentMonth && (
                      <div className="flex gap-0.5 mt-0.5">
                        {uniqueTypes.slice(0, 4).map((t, j) => {
                          const cfg = TYPE_CONFIG[t]
                          return <div key={j} className={`w-1 h-1 rounded-full ${cfg?.bg?.replace('/10', '') || 'bg-accent'}`}
                            style={{ backgroundColor: t === 'habit' ? '#a78bfa' : t === 'journal' ? '#e8d5b7' : t === 'workout' ? '#4ade80' : t === 'meal' ? '#fb923c' : t === 'task' ? '#60a5fa' : '#a78bfa' }} />
                        })}
                        {uniqueTypes.length > 4 && <span className="text-[7px] text-text-muted">+</span>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Month Activity Heat */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-text-muted font-medium">Activity Distribution</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(monthStats.types).map(([type, count]) => {
                  const cfg = TYPE_CONFIG[type]
                  if (!cfg) return null
                  return (
                    <div key={type} className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${cfg.bg}`}>
                      <cfg.icon className={`w-3 h-3 ${cfg.color}`} />
                      <span className={`text-[10px] font-medium ${cfg.color}`}>{count} {cfg.label.toLowerCase()}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Day Detail Panel */}
          <div>
            <div className="card sticky top-8">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <CalIcon className="w-3.5 h-3.5 text-accent" />
                {selectedDate === today ? 'Today' : selectedDate ? formatDate(selectedDate) : 'Select a day'}
              </h3>

              {isLoading ? (
                <p className="text-xs text-text-muted animate-pulse py-4 text-center">Loading...</p>
              ) : selectedEvents.length === 0 ? (
                <p className="text-xs text-text-muted py-8 text-center">No activity recorded</p>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {selectedEvents.map((event, i) => {
                    const cfg = TYPE_CONFIG[event.type]
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        className="flex items-start gap-2.5 p-2.5 rounded-lg bg-bg-elevated/50 hover:bg-bg-hover transition-colors">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg?.bg || 'bg-bg-elevated'}`}>
                          <span className="text-sm">{event.icon}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-text-primary">{event.title}</p>
                          {event.subtitle && <p className="text-[10px] text-text-muted mt-0.5">{event.subtitle}</p>}
                          <span className={`text-[9px] mt-1 inline-block px-1.5 py-0.5 rounded ${cfg?.bg || ''} ${cfg?.color || 'text-text-muted'}`}>
                            {cfg?.label || event.type}
                          </span>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}

              {/* Day Summary */}
              {selectedEvents.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] text-text-muted text-center">
                    {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''} ·{' '}
                    {[...new Set(selectedEvents.map(e => e.type))].length} categories
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Timeline View */
        <div className="space-y-1">
          {isLoading ? (
            <div className="text-center py-12"><p className="text-sm text-text-muted animate-pulse">Loading timeline...</p></div>
          ) : Object.keys(eventsByDate).length === 0 ? (
            <div className="text-center py-16 card"><p className="text-sm text-text-muted">No events this month</p></div>
          ) : (
            Object.entries(eventsByDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, evts]) => (
                <div key={date} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${date === today ? 'bg-accent' : 'bg-text-muted/30'}`} />
                    <h3 className="text-xs font-medium text-text-muted">
                      {date === today ? 'Today' : formatDate(date)}
                    </h3>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[9px] text-text-muted">{evts.length} events</span>
                  </div>
                  <div className="ml-4 space-y-1">
                    {evts.map((event, i) => {
                      const cfg = TYPE_CONFIG[event.type]
                      return (
                        <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                          className="card flex items-center gap-3 py-2.5">
                          <span className="text-base">{event.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-text-primary">{event.title}</p>
                            {event.subtitle && <p className="text-[10px] text-text-muted">{event.subtitle}</p>}
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${cfg?.bg || ''} ${cfg?.color || ''}`}>{cfg?.label}</span>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  )
}
