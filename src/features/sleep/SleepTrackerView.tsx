'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSleepTrackerStore } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, Moon, Sun, TrendingUp, Clock, Star } from 'lucide-react'

const QUALITY_LABELS = ['', 'Terrible', 'Poor', 'Fair', 'Good', 'Excellent']
const QUALITY_COLORS = ['', 'text-red-soft', 'text-orange-soft', 'text-text-muted', 'text-green-soft', 'text-accent']

export function SleepTrackerView() {
  const { logs, isLoading, fetchLogs, addLog, deleteLog } = useSleepTrackerStore()
  const [showAdd, setShowAdd] = useState(false)
  const [bedtime, setBedtime] = useState('23:00')
  const [waketime, setWaketime] = useState('07:00')
  const [quality, setQuality] = useState(3)
  const [notes, setNotes] = useState('')

  useEffect(() => { fetchLogs().catch(() => {}) }, [fetchLogs])

  const calcHours = (bed: string, wake: string) => {
    const [bh, bm] = bed.split(':').map(Number)
    const [wh, wm] = wake.split(':').map(Number)
    let mins = (wh * 60 + wm) - (bh * 60 + bm)
    if (mins < 0) mins += 24 * 60
    return +(mins / 60).toFixed(1)
  }

  const stats = useMemo(() => {
    if (logs.length === 0) return null
    const week = logs.slice(0, 7)
    return {
      avgHours: +(week.reduce((s, l) => s + l.hours, 0) / week.length).toFixed(1),
      avgQuality: +(week.reduce((s, l) => s + l.quality, 0) / week.length).toFixed(1),
      bestSleep: week.reduce((best, l) => l.quality > best.quality ? l : best, week[0]),
      totalLogs: logs.length,
      avgBedtime: (() => {
        const mins = week.map(l => {
          const [h, m] = l.bedtime.split(':').map(Number)
          return h >= 12 ? h * 60 + m : (h + 24) * 60 + m
        })
        const avg = mins.reduce((s, m) => s + m, 0) / mins.length
        const h = Math.floor(avg / 60) % 24
        const m = Math.round(avg % 60)
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      })(),
    }
  }, [logs])

  const handleAdd = async () => {
    const hours = calcHours(bedtime, waketime)
    await addLog({ date: toISODate(), bedtime, waketime, hours, quality, notes })
    setBedtime('23:00'); setWaketime('07:00'); setQuality(3); setNotes('')
    setShowAdd(false)
  }

  // Weekly chart
  const weekChart = useMemo(() => {
    return logs.slice(0, 7).reverse().map(l => ({
      date: l.date,
      hours: l.hours,
      quality: l.quality,
      pct: Math.min(100, (l.hours / 10) * 100),
    }))
  }, [logs])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Moon className="w-6 h-6 text-accent" /> Sleep
          </h1>
          <p className="text-text-muted text-xs mt-0.5">Track your rest and recovery</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn flex items-center gap-2"><Plus className="w-4 h-4" /> Log Sleep</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card text-center">
            <Clock className="w-4 h-4 text-accent mx-auto mb-1" />
            <p className="text-2xl font-bold text-accent">{stats.avgHours}h</p>
            <p className="text-[10px] text-text-muted">Avg Sleep (7d)</p>
          </div>
          <div className="card text-center">
            <Star className="w-4 h-4 text-green-soft mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-soft">{stats.avgQuality}/5</p>
            <p className="text-[10px] text-text-muted">Avg Quality</p>
          </div>
          <div className="card text-center">
            <Moon className="w-4 h-4 text-blue-soft mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-soft">{stats.avgBedtime}</p>
            <p className="text-[10px] text-text-muted">Avg Bedtime</p>
          </div>
          <div className="card text-center">
            <Sun className="w-4 h-4 text-orange-soft mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-soft">{stats.totalLogs}</p>
            <p className="text-[10px] text-text-muted">Nights Logged</p>
          </div>
        </div>
      )}

      {/* Week Chart */}
      {weekChart.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-xs font-medium text-text-muted mb-3">Last 7 Nights</h3>
          <div className="flex items-end gap-2 h-28">
            {weekChart.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-text-muted">{d.hours}h</span>
                <div className="w-full rounded-t-md relative transition-all" style={{ height: `${d.pct}%` }}>
                  <div className={`absolute inset-0 rounded-t-md ${
                    d.quality >= 4 ? 'bg-green-soft/60' : d.quality === 3 ? 'bg-accent/50' : 'bg-red-soft/50'
                  }`} />
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, s) => (
                    <div key={s} className={`w-1 h-1 rounded-full ${s < d.quality ? 'bg-accent' : 'bg-bg-elevated'}`} />
                  ))}
                </div>
                <span className="text-[7px] text-text-muted">{d.date.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="card border-accent/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Log Sleep</h3>
                <button onClick={() => setShowAdd(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className="text-[10px] text-text-muted uppercase block mb-1">Bedtime</label>
                  <input type="time" value={bedtime} onChange={e => setBedtime(e.target.value)} className="input text-xs" /></div>
                <div><label className="text-[10px] text-text-muted uppercase block mb-1">Wake Time</label>
                  <input type="time" value={waketime} onChange={e => setWaketime(e.target.value)} className="input text-xs" /></div>
              </div>
              <div className="mb-3">
                <label className="text-[10px] text-text-muted uppercase block mb-2">Sleep Quality</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(q => (
                    <button key={q} onClick={() => setQuality(q)}
                      className={`flex-1 py-2 rounded-lg text-xs transition-all ${
                        quality === q ? 'bg-accent/20 text-accent font-medium' : 'bg-bg-elevated text-text-muted hover:bg-bg-hover'
                      }`}>{QUALITY_LABELS[q]}</button>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-text-muted mb-3">Estimated: {calcHours(bedtime, waketime)}h of sleep</p>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="input w-full mb-4 text-xs" />
              <button onClick={handleAdd} className="btn w-full">Save</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log List */}
      {isLoading ? (
        <div className="text-center py-12"><p className="text-sm text-text-muted animate-pulse">Loading...</p></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 card"><p className="text-sm text-text-muted">No sleep data yet</p></div>
      ) : (
        <div className="space-y-1.5">
          {logs.map(log => (
            <div key={log._id} className="card group flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-soft/10 flex items-center justify-center shrink-0">
                <Moon className="w-4 h-4 text-blue-soft" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium">{formatDate(log.date)}</p>
                  <span className={`text-[10px] font-medium ${QUALITY_COLORS[log.quality]}`}>{QUALITY_LABELS[log.quality]}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-text-muted">
                  <span>{log.bedtime} → {log.waketime}</span>
                  <span className="text-accent font-medium">{log.hours}h</span>
                </div>
                {log.notes && <p className="text-[10px] text-text-muted mt-0.5">{log.notes}</p>}
              </div>
              <button onClick={() => deleteLog(log._id)} className="text-text-muted hover:text-red-soft opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
