'use client'

import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface DatePickerProps {
  value: string                    // YYYY-MM-DD or ''
  onChange: (date: string) => void
  placeholder?: string
  label?: string
  className?: string
}

export function DatePicker({ value, onChange, placeholder = 'Pick date', label, className = '' }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'days' | 'months' | 'years'>('days')
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const btnRef = useRef<HTMLButtonElement>(null)

  // When opening, jump to value's month or current month
  const handleOpen = useCallback(() => {
    if (value) {
      const d = new Date(value + 'T00:00')
      setMonth({ year: d.getFullYear(), month: d.getMonth() })
    } else {
      const now = new Date()
      setMonth({ year: now.getFullYear(), month: now.getMonth() })
    }
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      // Position below trigger, clamp to viewport
      const left = Math.min(rect.left, window.innerWidth - 292)
      const top = rect.bottom + 6
      setPos({
        top: top + 320 > window.innerHeight ? rect.top - 326 : top,
        left: Math.max(8, left),
      })
    }
    setView('days')
    setOpen(true)
  }, [value])

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return
    const reposition = () => {
      if (!btnRef.current) return
      const rect = btnRef.current.getBoundingClientRect()
      const left = Math.min(rect.left, window.innerWidth - 292)
      const top = rect.bottom + 6
      setPos({
        top: top + 320 > window.innerHeight ? rect.top - 326 : top,
        left: Math.max(8, left),
      })
    }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open])

  const grid = useMemo(() => {
    const { year, month: m } = month
    const startDay = new Date(year, m, 1).getDay()
    const daysInMonth = new Date(year, m + 1, 0).getDate()
    const cells: (string | null)[] = Array(startDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(`${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    while (cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [month])

  const today = new Date().toISOString().slice(0, 10)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const yearRangeStart = month.year - 4

  const navMonth = (offset: number) => {
    setMonth(prev => {
      let m = prev.month + offset, y = prev.year
      if (m < 0) { m = 11; y-- }
      if (m > 11) { m = 0; y++ }
      return { year: y, month: m }
    })
  }

  const selectDate = (ds: string) => {
    onChange(value === ds ? '' : ds)
    setOpen(false)
  }

  const displayValue = value
    ? new Date(value + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : placeholder

  return (
    <>
      {label && <label className="text-[10px] text-text-secondary uppercase block mb-1">{label}</label>}
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className={`input text-xs w-full text-left flex items-center justify-between gap-1 ${className}`}
      >
        <span className={value ? 'text-text-primary' : 'text-text-muted'}>{displayValue}</span>
        <Calendar className="w-3.5 h-3.5 text-text-muted shrink-0" />
      </button>

      {open && createPortal(
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[9999] rounded-xl p-4 w-[280px] border border-[rgba(255,255,255,0.14)]"
            style={{ background: '#1e1e1e', top: pos.top, left: pos.left, boxShadow: '0 16px 48px -8px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => {
                if (view === 'days') navMonth(-1)
                else if (view === 'months') setMonth(p => ({ ...p, year: p.year - 1 }))
                else setMonth(p => ({ ...p, year: p.year - 9 }))
              }}
                className="p-1.5 rounded-lg hover:bg-[#2a2a2a] transition-colors">
                <ChevronLeft className="w-4 h-4 text-[#999]" />
              </button>

              <button type="button" onClick={() => setView(v => v === 'days' ? 'months' : v === 'months' ? 'years' : 'years')}
                className="text-sm font-semibold text-[#e0e0e0] hover:text-accent transition-colors px-2 py-0.5 rounded-lg hover:bg-[#2a2a2a]">
                {view === 'years'
                  ? `${yearRangeStart} – ${yearRangeStart + 8}`
                  : view === 'months'
                  ? `${month.year}`
                  : new Date(month.year, month.month).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </button>

              <button type="button" onClick={() => {
                if (view === 'days') navMonth(1)
                else if (view === 'months') setMonth(p => ({ ...p, year: p.year + 1 }))
                else setMonth(p => ({ ...p, year: p.year + 9 }))
              }}
                className="p-1.5 rounded-lg hover:bg-[#2a2a2a] transition-colors">
                <ChevronRight className="w-4 h-4 text-[#999]" />
              </button>
            </div>

            {/* View content with transitions */}
            <AnimatePresence mode="wait">
            {/* Year picker */}
            {view === 'years' && (
              <motion.div key="years" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 9 }, (_, i) => yearRangeStart + i).map(y => (
                  <button key={y} type="button"
                    onClick={() => { setMonth(p => ({ ...p, year: y })); setView('months') }}
                    className={`py-2.5 rounded-lg text-xs font-medium transition-all ${
                      y === month.year ? 'bg-accent text-[#1a1a1a] font-bold' :
                      y === new Date().getFullYear() ? 'ring-1 ring-accent/50 text-accent hover:bg-[#2a2a2a]' :
                      'text-[#ccc] hover:bg-[#2a2a2a]'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
              </motion.div>
            )}

            {/* Month picker */}
            {view === 'months' && (
              <motion.div key="months" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}>
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((m, i) => (
                  <button key={m} type="button"
                    onClick={() => { setMonth(p => ({ ...p, month: i })); setView('days') }}
                    className={`py-2.5 rounded-lg text-xs font-medium transition-all ${
                      i === month.month && month.year === new Date().getFullYear() && i === new Date().getMonth()
                        ? 'ring-1 ring-accent/50 text-accent font-bold hover:bg-[#2a2a2a]'
                        : i === month.month
                        ? 'bg-accent/15 text-accent font-bold'
                        : 'text-[#ccc] hover:bg-[#2a2a2a]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              </motion.div>
            )}

            {/* Day picker */}
            {view === 'days' && (
              <motion.div key="days" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-[10px] text-[#666] font-medium py-1">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {grid.map((ds, i) => {
                if (!ds) return <div key={i} className="aspect-square" />
                const isSelected = value === ds
                const isToday = ds === today
                const isPast = ds < today
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectDate(ds)}
                    className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all relative ${
                      isSelected ? 'bg-accent text-[#1a1a1a] font-bold' :
                      isToday ? 'ring-1 ring-accent/60 text-accent font-bold hover:bg-[#2a2a2a]' :
                      isPast ? 'text-[#555] hover:bg-[#2a2a2a]' :
                      'text-[#ccc] hover:bg-[#2a2a2a]'
                    }`}
                  >
                    {parseInt(ds.split('-')[2])}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                    )}
                  </button>
                )
              })}
            </div>
            </motion.div>)}
            </AnimatePresence>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(255,255,255,0.08)]">
              <button type="button"
                onClick={() => { const now = new Date(); setMonth({ year: now.getFullYear(), month: now.getMonth() }) }}
                className="text-[11px] text-accent hover:text-accent/80 font-medium">
                Today
              </button>
              {value ? (
                <button type="button" onClick={() => { onChange(''); setOpen(false) }}
                  className="text-[11px] text-[#888] hover:text-[#ccc]">Clear</button>
              ) : (
                <span className="text-[10px] text-[#555]">Select a date</span>
              )}
            </div>
          </motion.div>
        </>,
        document.body
      )}
    </>
  )
}
