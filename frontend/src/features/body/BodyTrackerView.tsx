'use client'

import { useEffect, useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { useBodyTrackerStore } from '../../store'
import {
  AreaChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Scale, Ruler, History, RefreshCw, Plus, X, TrendingUp, TrendingDown, Minus,
  ChevronLeft, ChevronRight, Calendar,
} from 'lucide-react'
import { toast } from '@/components/Toast'
import { DateNavigator } from '@/components/DateNavigator'
import { toISODate } from '@/lib/utils'

export function BodyTrackerView() {
  const { logs, isLoading, fetchLogs, addLog } = useBodyTrackerStore()
  const [showForm, setShowForm] = useState(false)

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')

  const [neck, setNeck] = useState('')
  const [shoulders, setShoulders] = useState('')
  const [chest, setChest] = useState('')
  const [waist, setWaist] = useState('')
  const [hips, setHips] = useState('')

  const [leftArm, setLeftArm] = useState('')
  const [rightArm, setRightArm] = useState('')
  const [leftForearm, setLeftForearm] = useState('')
  const [rightForearm, setRightForearm] = useState('')
  const [leftThigh, setLeftThigh] = useState('')
  const [rightThigh, setRightThigh] = useState('')
  const [leftCalf, setLeftCalf] = useState('')
  const [rightCalf, setRightCalf] = useState('')

  useEffect(() => { fetchLogs().catch(() => toast.error('Failed to load body logs')) }, [fetchLogs])

  const handlePrefill = () => {
    if (!logs.length) return toast.error('No previous logs')
    const last = logs[logs.length - 1]
    setWeight(last.weight?.toString() ?? '')
    setBodyFat(last.bodyFat?.toString() ?? '')
    setNeck(last.measurements?.neck?.toString() ?? '')
    setShoulders(last.measurements?.shoulders?.toString() ?? '')
    setChest(last.measurements?.chest?.toString() ?? '')
    setWaist(last.measurements?.waist?.toString() ?? '')
    setHips(last.measurements?.hips?.toString() ?? '')
    setLeftArm(last.measurements?.leftArm?.toString() ?? last.measurements?.arms?.toString() ?? '')
    setRightArm(last.measurements?.rightArm?.toString() ?? last.measurements?.arms?.toString() ?? '')
    setLeftForearm(last.measurements?.leftForearm?.toString() ?? last.measurements?.forearms?.toString() ?? '')
    setRightForearm(last.measurements?.rightForearm?.toString() ?? last.measurements?.forearms?.toString() ?? '')
    setLeftThigh(last.measurements?.leftThigh?.toString() ?? last.measurements?.thighs?.toString() ?? '')
    setRightThigh(last.measurements?.rightThigh?.toString() ?? last.measurements?.thighs?.toString() ?? '')
    setLeftCalf(last.measurements?.leftCalf?.toString() ?? last.measurements?.calves?.toString() ?? '')
    setRightCalf(last.measurements?.rightCalf?.toString() ?? last.measurements?.calves?.toString() ?? '')
    toast.success('Prefilled from last entry')
  }

  const handleSubmit = async () => {
    if (!weight) return toast.error('Weight is required')
    try {
      await addLog({
        date,
        weight: Number(weight),
        bodyFat: bodyFat ? Number(bodyFat) : undefined,
        measurements: {
          neck: neck ? Number(neck) : undefined,
          shoulders: shoulders ? Number(shoulders) : undefined,
          chest: chest ? Number(chest) : undefined,
          waist: waist ? Number(waist) : undefined,
          hips: hips ? Number(hips) : undefined,
          leftArm: leftArm ? Number(leftArm) : undefined,
          rightArm: rightArm ? Number(rightArm) : undefined,
          leftForearm: leftForearm ? Number(leftForearm) : undefined,
          rightForearm: rightForearm ? Number(rightForearm) : undefined,
          leftThigh: leftThigh ? Number(leftThigh) : undefined,
          rightThigh: rightThigh ? Number(rightThigh) : undefined,
          leftCalf: leftCalf ? Number(leftCalf) : undefined,
          rightCalf: rightCalf ? Number(rightCalf) : undefined,
        },
        notes: '',
      })
      toast.success('Log saved!')
      setShowForm(false)
    } catch {
      toast.error('Failed to save log')
    }
  }

  const reversed = useMemo(() => [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [logs])
  const allChartData = useMemo(() => [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), [logs])
  const [chartRange, setChartRange] = useState<'7d' | '30d' | '90d' | 'all'>('all')
  const chartData = useMemo(() => {
    if (chartRange === 'all') return allChartData
    const now = Date.now()
    const days = chartRange === '7d' ? 7 : chartRange === '30d' ? 30 : 90
    const cutoff = now - days * 86400000
    return allChartData.filter(d => new Date(d.date).getTime() >= cutoff)
  }, [allChartData, chartRange])
  const avgWeight = useMemo(() => {
    const withWeight = chartData.filter(d => d.weight != null && d.weight > 0)
    if (!withWeight.length) return 0
    return withWeight.reduce((s, d) => s + d.weight!, 0) / withWeight.length
  }, [chartData])
  const hasBodyFat = useMemo(() => chartData.some(d => d.bodyFat), [chartData])

  const latest = reversed[0]
  const prev = reversed[1]
  const weightDelta = latest && prev ? (latest.weight ?? 0) - (prev.weight ?? 0) : null

  // Calendar state
  const today = toISODate()
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(date + 'T12:00:00')
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [calView, setCalView] = useState<'days' | 'months' | 'years'>('days')
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const yearRangeStart = calMonth.year - 4

  const loggedDates = useMemo(() => new Set(logs.map(l => l.date)), [logs])
  const logByDate = useMemo(() => {
    const map: Record<string, typeof logs[0]> = {}
    logs.forEach(l => { map[l.date] = l })
    return map
  }, [logs])

  const calDays = useMemo(() => {
    const { year, month } = calMonth
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (string | null)[] = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    return days
  }, [calMonth])

  const calMonthLabel = new Date(calMonth.year, calMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const navMonth = (offset: number) => {
    setCalMonth(prev => {
      let m = prev.month + offset, y = prev.year
      if (m < 0) { m = 11; y-- }
      if (m > 11) { m = 0; y++ }
      return { year: y, month: m }
    })
  }

  const selectedDayLog = logByDate[date]

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Scale size={22} className="text-accent" /> Body Tracker
          </h1>
          <p className="text-text-muted text-sm mt-1">Track your physique progress</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrefill} className="btn-ghost text-xs">
            <RefreshCw size={14} /> Prefill
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn text-xs">
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? 'Cancel' : 'New Log'}
          </button>
        </div>
      </div>

      <DateNavigator value={date} onChange={(d) => { setDate(d); const dd = new Date(d + 'T12:00:00'); setCalMonth({ year: dd.getFullYear(), month: dd.getMonth() }) }} />

      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Weight', value: `${latest.weight ?? '-'} kg`, delta: weightDelta, unit: 'kg' },
            { label: 'Body Fat', value: latest.bodyFat ? `${latest.bodyFat}%` : '-', delta: latest && prev && latest.bodyFat && prev.bodyFat ? latest.bodyFat - prev.bodyFat : null, unit: '%' },
            { label: 'Last Log', value: (() => { try { return format(parseISO(latest.date), 'MMM d') } catch { return latest.date } })(), delta: null, unit: '' },
            { label: 'Data Points', value: Object.values(latest.measurements ?? {}).filter(Boolean).length.toString(), delta: null, unit: '' },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <p className="text-[10px] uppercase text-text-muted tracking-wider mb-1">{s.label}</p>
              <div className="flex items-end gap-2">
                <p className="text-xl font-bold text-text-primary">{s.value}</p>
                {s.delta !== null && s.delta !== 0 && (
                  <span className={`flex items-center gap-0.5 text-xs font-medium mb-0.5 ${s.delta > 0 ? 'text-green-soft' : 'text-red-soft'}`}>
                    {s.delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {s.delta > 0 ? '+' : ''}{s.delta.toFixed(1)}{s.unit}
                  </span>
                )}
                {s.delta === 0 && (
                  <span className="flex items-center gap-0.5 text-xs font-medium mb-0.5 text-text-muted"><Minus size={12} /> 0</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="card border-accent/30">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Scale size={14} className="text-accent" /> Log Entry
                </h3>
                <button onClick={() => setShowForm(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[10px] text-text-secondary uppercase block mb-1">Weight (kg) *</label>
                  <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className="input text-xs w-full" placeholder="0.0" />
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary uppercase block mb-1">Body Fat (%)</label>
                  <input type="number" step="0.1" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} className="input text-xs w-full" placeholder="0.0" />
                </div>
              </div>

              <div className="mb-4">
                <p className="text-[10px] uppercase text-text-muted tracking-wider mb-2 flex items-center gap-1.5">
                  <Ruler size={12} /> Core Measurements (cm)
                </p>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { label: 'Neck', val: neck, set: setNeck },
                    { label: 'Shoulders', val: shoulders, set: setShoulders },
                    { label: 'Chest', val: chest, set: setChest },
                    { label: 'Waist', val: waist, set: setWaist },
                    { label: 'Hips', val: hips, set: setHips },
                  ].map((m) => (
                    <div key={m.label}>
                      <label className="text-[10px] text-text-secondary uppercase block mb-1">{m.label}</label>
                      <input type="number" step="0.1" value={m.val} onChange={(e) => m.set(e.target.value)} className="input text-xs w-full" placeholder="0.0" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <p className="text-[10px] uppercase text-text-muted tracking-wider mb-2 flex items-center gap-1.5">
                  <Ruler size={12} /> Extremities — Left / Right (cm)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Arms', L: leftArm, setL: setLeftArm, R: rightArm, setR: setRightArm },
                    { label: 'Forearms', L: leftForearm, setL: setLeftForearm, R: rightForearm, setR: setRightForearm },
                    { label: 'Thighs', L: leftThigh, setL: setLeftThigh, R: rightThigh, setR: setRightThigh },
                    { label: 'Calves', L: leftCalf, setL: setLeftCalf, R: rightCalf, setR: setRightCalf },
                  ].map((m) => (
                    <div key={m.label} className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-text-secondary uppercase block">{m.label}</label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted font-mono pointer-events-none">L</span>
                          <input type="number" step="0.1" value={m.L} onChange={(e) => m.setL(e.target.value)} className="input text-xs w-full !pl-7" placeholder="0.0" />
                        </div>
                        <div className="flex-1 relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-text-muted font-mono pointer-events-none">R</span>
                          <input type="number" step="0.1" value={m.R} onChange={(e) => m.setR(e.target.value)} className="input text-xs w-full !pl-7" placeholder="0.0" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleSubmit} disabled={isLoading} className="btn w-full">
                {isLoading ? 'Saving...' : 'Save Log'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-4 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] uppercase text-text-muted tracking-wider flex items-center gap-1.5">
              <Calendar size={12} /> Log Calendar
            </h2>
            <button onClick={() => { setDate(today); const d = new Date(); setCalMonth({ year: d.getFullYear(), month: d.getMonth() }) }}
              className="text-[10px] text-accent hover:text-accent-warm transition-colors cursor-pointer">Today</button>
          </div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => {
              if (calView === 'days') navMonth(-1)
              else if (calView === 'months') setCalMonth(p => ({ ...p, year: p.year - 1 }))
              else setCalMonth(p => ({ ...p, year: p.year - 9 }))
            }} className="p-1 rounded-lg hover:bg-glass-strong transition-colors"><ChevronLeft size={16} className="text-text-muted" /></button>
            <button onClick={() => setCalView(v => v === 'days' ? 'months' : v === 'months' ? 'years' : 'years')}
              className="text-xs font-medium text-text-primary hover:text-accent transition-colors px-1.5 py-0.5 rounded-lg hover:bg-glass-strong cursor-pointer">
              {calView === 'years' ? `${yearRangeStart} – ${yearRangeStart + 8}` :
               calView === 'months' ? `${calMonth.year}` : calMonthLabel}
            </button>
            <button onClick={() => {
              if (calView === 'days') navMonth(1)
              else if (calView === 'months') setCalMonth(p => ({ ...p, year: p.year + 1 }))
              else setCalMonth(p => ({ ...p, year: p.year + 9 }))
            }} className="p-1 rounded-lg hover:bg-glass-strong transition-colors"><ChevronRight size={16} className="text-text-muted" /></button>
          </div>

          <AnimatePresence mode="wait">
          {/* Year picker */}
          {calView === 'years' && (
            <motion.div key="years" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}>
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 9 }, (_, i) => yearRangeStart + i).map(y => (
                <button key={y} onClick={() => { setCalMonth(p => ({ ...p, year: y })); setCalView('months') }}
                  className={`py-2 rounded-lg text-xs font-medium transition-all ${
                    y === new Date().getFullYear() ? 'ring-1 ring-accent/40 text-accent' :
                    'text-text-secondary hover:bg-glass-strong'
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
                    className={`py-2 rounded-lg text-xs font-medium transition-all ${
                      isCurrent ? 'ring-1 ring-accent/40 text-accent' :
                      i === calMonth.month ? 'bg-accent/15 text-accent' :
                      'text-text-secondary hover:bg-glass-strong'
                    }`}>{m}</button>
                )
              })}
            </div>
            </motion.div>
          )}

          {/* Day picker */}
          {calView === 'days' && (
            <motion.div key="days" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.15 }}>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} className="text-center text-[10px] text-text-muted py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calDays.map((iso, i) => {
              if (!iso) return <div key={`e-${i}`} />
              const day = new Date(iso + 'T12:00:00').getDate()
              const isSelected = iso === date
              const hasLog = loggedDates.has(iso)
              const isCurrentDay = iso === today
              return (
                <button key={iso} onClick={() => { setDate(iso); }}
                  className={`relative aspect-square flex items-center justify-center text-xs rounded-lg transition-all cursor-pointer
                    ${isSelected ? 'bg-accent/20 text-accent font-bold ring-1 ring-accent/40' :
                      isCurrentDay ? 'text-accent font-semibold' :
                      'text-text-secondary hover:bg-glass-strong'}`}>
                  {day}
                  {hasLog && <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-accent' : 'bg-green-soft'}`} />}
                </button>
              )
            })}
          </div>
          </motion.div>)}
          </AnimatePresence>

          {/* Selected day detail */}
          {selectedDayLog && (
            <div className="mt-4 pt-4 border-t border-glass-border space-y-2">
              <p className="text-[10px] uppercase text-text-muted tracking-wider">
                {(() => { try { return format(parseISO(date), 'MMMM d, yyyy') } catch { return date } })()}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-text-primary">{selectedDayLog.weight} kg</span>
                {selectedDayLog.bodyFat !== undefined && <span className="text-xs text-text-muted">{selectedDayLog.bodyFat}% BF</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(selectedDayLog.measurements ?? {}).filter(([, v]) => v).map(([k, v]) => (
                  <span key={k} className="text-[10px] bg-glass border border-glass-border px-2 py-0.5 rounded-md text-text-secondary">
                    {k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}: {v}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!selectedDayLog && (
            <div className="mt-4 pt-4 border-t border-glass-border text-center text-text-muted text-xs py-3">
              No log for this date
            </div>
          )}
        </div>

        {/* Weight Trend */}
        <div className="lg:col-span-5 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] uppercase text-text-muted tracking-wider flex items-center gap-1.5">
              <TrendingUp size={12} /> Weight Trend
            </h2>
            <div className="flex gap-1">
              {(['7d', '30d', '90d', 'all'] as const).map(r => (
                <button key={r} onClick={() => setChartRange(r)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer
                    ${chartRange === r ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-secondary hover:bg-glass-strong'}`}>
                  {r === 'all' ? 'All' : r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[280px]">
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#e8d5b7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#e8d5b7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="bfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis
                    dataKey="date" stroke="rgba(255,255,255,0.15)" fontSize={10}
                    tickLine={false} axisLine={false}
                    tickFormatter={(v) => { try { return format(parseISO(v), 'MMM d') } catch { return v } }}
                  />
                  <YAxis
                    yAxisId="weight"
                    domain={['dataMin - 2', 'dataMax + 2']} stroke="rgba(255,255,255,0.15)"
                    fontSize={10} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${v}kg`}
                  />
                  {hasBodyFat && (
                    <YAxis
                      yAxisId="bf" orientation="right"
                      domain={['dataMin - 2', 'dataMax + 2']} stroke="rgba(255,255,255,0.1)"
                      fontSize={10} tickLine={false} axisLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                  )}
                  <ReferenceLine
                    yAxisId="weight" y={avgWeight}
                    stroke="rgba(232,213,183,0.25)" strokeDasharray="4 4"
                    label={{ value: `avg ${avgWeight.toFixed(1)}`, position: 'insideTopRight', fill: 'rgba(232,213,183,0.4)', fontSize: 10 }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      let dateLabel = String(label ?? '')
                      try { dateLabel = format(parseISO(dateLabel), 'EEEE, MMM d, yyyy') } catch { /* */ }
                      const w = payload.find(p => p.dataKey === 'weight')?.value as number | undefined
                      const bf = payload.find(p => p.dataKey === 'bodyFat')?.value as number | undefined
                      return (
                        <div className="bg-[rgba(10,10,10,0.96)] border border-glass-border rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl">
                          <p className="text-[10px] text-text-muted mb-2">{dateLabel}</p>
                          {w !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-accent" />
                              <span className="text-sm font-semibold text-text-primary">{w} kg</span>
                            </div>
                          )}
                          {bf !== undefined && bf !== null && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="w-2 h-2 rounded-full bg-blue-400" />
                              <span className="text-sm text-text-secondary">{bf}% BF</span>
                            </div>
                          )}
                        </div>
                      )
                    }}
                  />
                  <Area
                    yAxisId="weight" type="monotone" dataKey="weight"
                    stroke="#e8d5b7" strokeWidth={2.5} fill="url(#weightGrad)"
                    dot={false}
                    activeDot={{ r: 5, stroke: '#e8d5b7', strokeWidth: 2, fill: '#0a0a0a' }}
                  />
                  {hasBodyFat && (
                    <Area
                      yAxisId="bf" type="monotone" dataKey="bodyFat"
                      stroke="#60a5fa" strokeWidth={1.5} fill="url(#bfGrad)"
                      dot={false} strokeDasharray="4 2"
                      activeDot={{ r: 4, stroke: '#60a5fa', strokeWidth: 2, fill: '#0a0a0a' }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-text-muted text-sm">
                <Scale className="w-8 h-8 mb-2 opacity-30" />
                Add at least 2 logs to see trends
              </div>
            )}
          </div>
          {chartData.length > 1 && (
            <div className="flex items-center justify-center gap-5 mt-3 pt-3 border-t border-glass-border">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full bg-accent" />
                <span className="text-[10px] text-text-muted">Weight</span>
              </div>
              {hasBodyFat && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 rounded-full bg-blue-400 opacity-70" />
                  <span className="text-[10px] text-text-muted">Body Fat</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-[1px] border-t border-dashed border-accent/40" />
                <span className="text-[10px] text-text-muted">Avg</span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Logs */}
        <div className="lg:col-span-3 card">
          <h2 className="text-[10px] uppercase text-text-muted tracking-wider mb-4 flex items-center gap-1.5">
            <History size={12} /> Recent Logs
          </h2>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
            {reversed.map((log, i) => {
              let dateStr = log.date
              try { dateStr = format(parseISO(log.date), 'MMM dd, yyyy') } catch { /* */ }
              const pts = Object.values(log.measurements ?? {}).filter(Boolean).length
              const prevLog = reversed[i + 1]
              const wd = prevLog ? (log.weight ?? 0) - (prevLog.weight ?? 0) : null

              return (
                <button key={log._id} onClick={() => { setDate(log.date); const d = new Date(log.date + 'T12:00:00'); setCalMonth({ year: d.getFullYear(), month: d.getMonth() }) }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors text-left cursor-pointer
                    ${log.date === date ? 'bg-accent/10 border-accent/30' : 'bg-glass border-glass-border hover:bg-glass-strong'}`}>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{dateStr}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-semibold text-accent">{log.weight} kg</span>
                      {log.bodyFat !== undefined && <span className="text-[11px] text-text-muted">{log.bodyFat}%</span>}
                      {wd !== null && wd !== 0 && (
                        <span className={`text-[10px] font-medium ${wd > 0 ? 'text-green-soft' : 'text-red-soft'}`}>
                          {wd > 0 ? '+' : ''}{wd.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-text-muted bg-glass px-2 py-1 rounded-md">{pts} pts</span>
                </button>
              )
            })}
            {!reversed.length && (
              <div className="text-center text-text-muted py-8 text-sm">
                No logs yet. Start tracking!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
