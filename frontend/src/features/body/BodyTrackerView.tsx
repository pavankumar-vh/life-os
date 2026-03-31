'use client'

import { useEffect, useState, useMemo } from 'react'
import { useBodyTrackerStore, type BodyLogData } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, Scale, TrendingDown, TrendingUp, Ruler, Activity } from 'lucide-react'
import { ListSkeleton } from '@/components/Skeletons'
import { DateNavigator } from '@/components/DateNavigator'
import { toast } from '@/components/Toast'

export function BodyTrackerView() {
  const { logs, isLoading, fetchLogs, addLog, deleteLog } = useBodyTrackerStore()
  const [showAdd, setShowAdd] = useState(false)
  const [weight, setWeight] = useState<number | ''>('')
  const [bodyFat, setBodyFat] = useState<number | ''>('')
  const [chest, setChest] = useState<number | ''>('')
  const [waist, setWaist] = useState<number | ''>('')
  const [hips, setHips] = useState<number | ''>('')
  const [arms, setArms] = useState<number | ''>('')
  const [thighs, setThighs] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [selectedDate, setSelectedDate] = useState(toISODate())

  useEffect(() => { fetchLogs().catch(() => toast.error('Failed to load body logs')) }, [fetchLogs])

  const stats = useMemo(() => {
    if (logs.length < 2) return null
    const latest = logs[0]
    const oldest = logs[logs.length - 1]
    const prev = logs[1]
    return {
      currentWeight: latest.weight,
      weightChange: latest.weight && prev.weight ? +(latest.weight - prev.weight).toFixed(1) : 0,
      totalChange: latest.weight && oldest.weight ? +(latest.weight - oldest.weight).toFixed(1) : 0,
      currentBF: latest.bodyFat,
      bfChange: latest.bodyFat && prev.bodyFat ? +(latest.bodyFat - prev.bodyFat).toFixed(1) : 0,
      entries: logs.length,
    }
  }, [logs])

  const handleAdd = async () => {
    await addLog({
      date: selectedDate,
      weight: weight || undefined,
      bodyFat: bodyFat || undefined,
      measurements: {
        chest: chest || undefined,
        waist: waist || undefined,
        hips: hips || undefined,
        arms: arms || undefined,
        thighs: thighs || undefined,
      },
      notes,
    }).catch(() => toast.error('Failed to save body log'))
    setWeight(''); setBodyFat(''); setChest(''); setWaist(''); setHips(''); setArms(''); setThighs(''); setNotes('')
    setShowAdd(false)
  }

  // Mini chart for weight history
  const weightHistory = useMemo(() => {
    const data = logs.filter(l => l.weight).slice(0, 12).reverse()
    if (data.length < 2) return null
    const weights = data.map(d => d.weight!)
    const min = Math.min(...weights)
    const max = Math.max(...weights)
    const range = max - min || 1
    return data.map(d => ({
      date: d.date,
      weight: d.weight!,
      pct: ((d.weight! - min) / range) * 100,
    }))
  }, [logs])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Scale className="w-6 h-6 text-accent" /> Body Tracker
          </h1>
          <DateNavigator value={selectedDate} onChange={setSelectedDate} />
        </div>
        <button onClick={() => setShowAdd(true)} className="btn flex items-center gap-2"><Plus className="w-4 h-4" /> Log</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card text-center">
            <p className="text-2xl font-bold text-accent">{stats.currentWeight || '—'}</p>
            <p className="text-xs text-text-muted">Current Weight (kg)</p>
          </div>
          <div className="card text-center">
            <div className="flex items-center justify-center gap-1">
              {stats.weightChange <= 0 ? <TrendingDown className="w-4 h-4 text-green-soft" /> : <TrendingUp className="w-4 h-4 text-red-soft" />}
              <p className={`text-2xl font-bold ${stats.weightChange <= 0 ? 'text-green-soft' : 'text-red-soft'}`}>{stats.weightChange > 0 ? '+' : ''}{stats.weightChange}</p>
            </div>
            <p className="text-xs text-text-muted">vs Last Entry (kg)</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-blue-soft">{stats.currentBF || '—'}%</p>
            <p className="text-xs text-text-muted">Body Fat</p>
          </div>
          <div className="card text-center">
            <p className={`text-2xl font-bold ${stats.totalChange! <= 0 ? 'text-green-soft' : 'text-orange-soft'}`}>{stats.totalChange! > 0 ? '+' : ''}{stats.totalChange}</p>
            <p className="text-xs text-text-muted">Total Change (kg)</p>
          </div>
        </div>
      )}

      {/* Weight Chart */}
      {weightHistory && (
        <div className="card mb-6">
          <h3 className="text-xs font-medium text-text-muted mb-3">Weight Trend</h3>
          <div className="flex items-end gap-1 h-24">
            {weightHistory.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-text-muted">{d.weight}</span>
                <div className="w-full bg-accent/20 rounded-t-sm relative" style={{ height: `${Math.max(8, d.pct)}%` }}>
                  <div className="absolute inset-0 bg-accent/60 rounded-t-sm" />
                </div>
                <span className="text-[11px] text-text-secondary">{d.date.slice(5)}</span>
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
                <h3 className="text-sm font-medium">Log Body Stats</h3>
                <button onClick={() => setShowAdd(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className="text-xs text-text-secondary uppercase block mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value ? +e.target.value : '')} className="input text-xs" /></div>
                <div><label className="text-xs text-text-secondary uppercase block mb-1">Body Fat %</label>
                  <input type="number" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value ? +e.target.value : '')} className="input text-xs" /></div>
              </div>
              <p className="text-xs text-text-muted mb-2 flex items-center gap-1"><Ruler className="w-3 h-3" /> Measurements (cm)</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div><label className="text-xs text-text-secondary block mb-1">Chest</label>
                  <input type="number" step="0.5" value={chest} onChange={e => setChest(e.target.value ? +e.target.value : '')} className="input text-xs" /></div>
                <div><label className="text-xs text-text-secondary block mb-1">Waist</label>
                  <input type="number" step="0.5" value={waist} onChange={e => setWaist(e.target.value ? +e.target.value : '')} className="input text-xs" /></div>
                <div><label className="text-xs text-text-secondary block mb-1">Hips</label>
                  <input type="number" step="0.5" value={hips} onChange={e => setHips(e.target.value ? +e.target.value : '')} className="input text-xs" /></div>
                <div><label className="text-xs text-text-secondary block mb-1">Arms</label>
                  <input type="number" step="0.5" value={arms} onChange={e => setArms(e.target.value ? +e.target.value : '')} className="input text-xs" /></div>
                <div><label className="text-xs text-text-secondary block mb-1">Thighs</label>
                  <input type="number" step="0.5" value={thighs} onChange={e => setThighs(e.target.value ? +e.target.value : '')} className="input text-xs" /></div>
              </div>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="input w-full mb-4 text-xs" />
              <button onClick={handleAdd} className="btn w-full">Save Entry</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logs List */}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : logs.length === 0 ? (
        <div className="text-center py-16 card"><p className="text-sm text-text-muted">No body stats logged yet</p></div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log._id} className="card group flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium">{formatDate(log.date)}</p>
                </div>
                <div className="flex flex-wrap gap-3 mt-1 text-xs">
                  {log.weight && <span className="text-accent font-medium">{log.weight} kg</span>}
                  {log.bodyFat && <span className="text-blue-soft">{log.bodyFat}% BF</span>}
                  {log.measurements?.chest && <span className="text-text-muted">Chest: {log.measurements.chest}</span>}
                  {log.measurements?.waist && <span className="text-text-muted">Waist: {log.measurements.waist}</span>}
                  {log.measurements?.arms && <span className="text-text-muted">Arms: {log.measurements.arms}</span>}
                </div>
                {log.notes && <p className="text-xs text-text-muted mt-0.5">{log.notes}</p>}
              </div>
              <button onClick={() => { if (confirm('Delete this log?')) deleteLog(log._id).catch(() => toast.error('Failed to delete')) }} className="text-text-muted hover:text-red-soft md:opacity-0 md:group-hover:opacity-100 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
