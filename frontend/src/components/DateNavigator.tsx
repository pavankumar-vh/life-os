'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { toISODate, formatDate } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface DateNavigatorProps {
  value: string            // ISO date string YYYY-MM-DD
  onChange: (date: string) => void
  disableFuture?: boolean  // default true
}

export function DateNavigator({ value, onChange, disableFuture = true }: DateNavigatorProps) {
  const today = toISODate()
  const [showCal, setShowCal] = useState(false)
  const [calView, setCalView] = useState<'days' | 'months' | 'years'>('days')
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(value + 'T12:00:00')
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const ref = useRef<HTMLDivElement>(null)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const yearRangeStart = calMonth.year - 4

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowCal(false)
    }
    if (showCal) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCal])

  // Sync calendar month when value changes externally
  useEffect(() => {
    const d = new Date(value + 'T12:00:00')
    setCalMonth({ year: d.getFullYear(), month: d.getMonth() })
  }, [value])

  const navigateDate = (offset: number) => {
    const d = new Date(value + 'T12:00:00')
    d.setDate(d.getDate() + offset)
    const next = toISODate(d)
    if (disableFuture && next > today) return
    onChange(next)
  }

  const isToday = value === today
  const isFutureBlocked = disableFuture && value >= today

  // Calendar grid
  const calendarDays = useMemo(() => {
    const { year, month } = calMonth
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (string | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push(iso)
    }
    return days
  }, [calMonth])

  const monthLabel = new Date(calMonth.year, calMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const navMonth = (offset: number) => {
    setCalMonth(prev => {
      let m = prev.month + offset
      let y = prev.year
      if (m < 0) { m = 11; y-- }
      if (m > 11) { m = 0; y++ }
      return { year: y, month: m }
    })
  }

  const selectDate = (iso: string) => {
    if (disableFuture && iso > today) return
    onChange(iso)
    setShowCal(false)
  }

  const displayLabel = isToday
    ? 'Today'
    : (() => {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        return value === toISODate(yesterday) ? 'Yesterday' : formatDate(value)
      })()

  return (
    <div className="flex items-center gap-1.5 relative" ref={ref}>
      <button onClick={() => navigateDate(-1)}
        className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      <button onClick={() => { setShowCal(!showCal); setCalView('days') }}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors">
        <Calendar className="w-3 h-3" />
        {displayLabel}
      </button>

      <button onClick={() => navigateDate(1)}
        className={`p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors ${isFutureBlocked ? 'opacity-30 pointer-events-none' : ''}`}>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {!isToday && (
        <button onClick={() => onChange(today)}
          className="text-accent text-[11px] hover:underline ml-0.5">
          Today
        </button>
      )}

      {/* Calendar popover */}
      <AnimatePresence>
        {showCal && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 z-50 w-[260px] rounded-xl bg-[rgba(18,18,18,0.98)] border border-white/[0.08] shadow-xl backdrop-blur-xl p-3"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <button onClick={() => {
                if (calView === 'days') navMonth(-1)
                else if (calView === 'months') setCalMonth(p => ({ ...p, year: p.year - 1 }))
                else setCalMonth(p => ({ ...p, year: p.year - 9 }))
              }} className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setCalView(v => v === 'days' ? 'months' : v === 'months' ? 'years' : 'years')}
                className="text-xs font-medium text-text-primary hover:text-accent transition-colors px-1.5 py-0.5 rounded-md hover:bg-bg-hover">
                {calView === 'years'
                  ? `${yearRangeStart} – ${yearRangeStart + 8}`
                  : calView === 'months'
                  ? `${calMonth.year}`
                  : monthLabel}
              </button>
              <button onClick={() => {
                if (calView === 'days') navMonth(1)
                else if (calView === 'months') setCalMonth(p => ({ ...p, year: p.year + 1 }))
                else setCalMonth(p => ({ ...p, year: p.year + 9 }))
              }} className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <AnimatePresence mode="wait">
            {/* Year picker */}
            {calView === 'years' && (
              <motion.div key="years" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}>
              <div className="grid grid-cols-3 gap-1.5">
                {Array.from({ length: 9 }, (_, i) => yearRangeStart + i).map(y => (
                  <button key={y} onClick={() => { setCalMonth(p => ({ ...p, year: y })); setCalView('months') }}
                    className={`py-2 rounded-lg text-[11px] font-medium transition-all ${
                      y === new Date().getFullYear() ? 'ring-1 ring-accent/50 text-accent' :
                      'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}>{y}</button>
                ))}
              </div>
              </motion.div>
            )}

            {/* Month picker */}
            {calView === 'months' && (
              <motion.div key="months" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTHS.map((m, i) => {
                  const isCurrent = calMonth.year === new Date().getFullYear() && i === new Date().getMonth()
                  return (
                    <button key={m} onClick={() => { setCalMonth(p => ({ ...p, month: i })); setCalView('days') }}
                      className={`py-2 rounded-lg text-[11px] font-medium transition-all ${
                        isCurrent ? 'ring-1 ring-accent/50 text-accent' :
                        i === calMonth.month ? 'bg-accent/15 text-accent' :
                        'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                      }`}>{m}</button>
                  )
                })}
              </div>
              </motion.div>
            )}

            {/* Day picker */}
            {calView === 'days' && (
              <motion.div key="days" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                <div key={d} className="text-center text-[10px] text-text-muted font-medium py-0.5">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((iso, i) => {
                if (!iso) return <div key={`empty-${i}`} />
                const isSelected = iso === value
                const isTodayDate = iso === today
                const isFuture = disableFuture && iso > today
                const day = parseInt(iso.split('-')[2])
                return (
                  <button key={iso} onClick={() => selectDate(iso)} disabled={isFuture}
                    className={`aspect-square rounded-lg text-[11px] font-medium transition-all flex items-center justify-center ${
                      isSelected
                        ? 'bg-accent text-bg-primary'
                        : isTodayDate
                        ? 'bg-accent/15 text-accent'
                        : isFuture
                        ? 'text-text-muted/30 cursor-not-allowed'
                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            </motion.div>)}
            </AnimatePresence>

            {/* Quick actions */}
            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/[0.06]">
              <button onClick={() => selectDate(today)}
                className="flex-1 text-center py-1 rounded-lg text-[11px] text-accent hover:bg-accent/10 transition-colors">
                Today
              </button>
              <button onClick={() => { const d = new Date(); d.setDate(d.getDate() - 1); selectDate(toISODate(d)) }}
                className="flex-1 text-center py-1 rounded-lg text-[11px] text-text-secondary hover:bg-bg-hover transition-colors">
                Yesterday
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
