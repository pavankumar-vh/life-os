'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSleepTrackerStore } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, Moon, Sun, TrendingUp, Clock, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { ListSkeleton } from '@/components/Skeletons'
import { DateNavigator } from '@/components/DateNavigator'
import { DatePicker } from '@/components/DatePicker'
import { toast } from '@/components/Toast'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Cell,
} from 'recharts'
import { format, parseISO } from 'date-fns'

const QUALITY_LABELS = ['', 'Terrible', 'Poor', 'Fair', 'Good', 'Excellent']
const QUALITY_COLORS = ['', 'text-red-soft', 'text-orange-soft', 'text-text-muted', 'text-green-soft', 'text-accent']

export function SleepTrackerView() {
  const { logs, isLoading, fetchLogs, addLog, deleteLog } = useSleepTrackerStore()
  const [showAdd, setShowAdd] = useState(false)
  const [bedtime, setBedtime] = useState('23:00')
  const [waketime, setWaketime] = useState('07:00')
  const [quality, setQuality] = useState(3)
  const [notes, setNotes] = useState('')
  const [selectedDate, setSelectedDate] = useState(toISODate())

  useEffect(() => { fetchLogs().catch(() => toast.error('Failed to load sleep logs')) }, [fetchLogs])

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
    await addLog({ date: selectedDate, bedtime, waketime, hours, quality, notes }).catch(() => toast.error('Failed to save sleep log'))
    setBedtime('23:00'); setWaketime('07:00'); setQuality(3); setNotes('')
    setShowAdd(false)
  }

  // Chart data
  const [chartRange, setChartRange] = useState<'7d' | '14d' | '30d' | 'all'>('14d')
  const chartData = useMemo(() => {
    const sorted = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    if (chartRange === 'all') return sorted
    const days = chartRange === '7d' ? 7 : chartRange === '14d' ? 14 : 30
    const cutoff = Date.now() - days * 86400000
    return sorted.filter(d => new Date(d.date).getTime() >= cutoff)
  }, [logs, chartRange])
  const avgHoursLine = useMemo(() => {
    if (!chartData.length) return 0
    return chartData.reduce((s, d) => s + d.hours, 0) / chartData.length
  }, [chartData])

  const QUALITY_BAR_COLORS = ['', '#ef4444', '#f97316', '#9ca3af', '#4ade80', '#e8d5b7']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Moon className="w-6 h-6 text-accent" /> Sleep
          </h1>
          <DateNavigator value={selectedDate} onChange={setSelectedDate} />
        </div>
        <button onClick={() => setShowAdd(true)} className="btn flex items-center gap-2"><Plus className="w-4 h-4" /> Log Sleep</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card text-center">
            <Clock className="w-4 h-4 text-accent mx-auto mb-1" />
            <p className="text-2xl font-bold text-accent">{stats.avgHours}h</p>
            <p className="text-xs text-text-secondary">Avg Sleep (7d)</p>
          </div>
          <div className="card text-center">
            <Star className="w-4 h-4 text-green-soft mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-soft">{stats.avgQuality}/5</p>
            <p className="text-xs text-text-secondary">Avg Quality</p>
          </div>
          <div className="card text-center">
            <Moon className="w-4 h-4 text-blue-soft mx-auto mb-1" />
            <p className="text-2xl font-bold text-blue-soft">{stats.avgBedtime}</p>
            <p className="text-xs text-text-secondary">Avg Bedtime</p>
          </div>
          <div className="card text-center">
            <Sun className="w-4 h-4 text-orange-soft mx-auto mb-1" />
            <p className="text-2xl font-bold text-orange-soft">{stats.totalLogs}</p>
            <p className="text-xs text-text-muted">Nights Logged</p>
          </div>
        </div>
      )}

      {/* Sleep Chart */}
      {logs.length > 1 && (
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] uppercase text-text-muted tracking-wider flex items-center gap-1.5">
              <TrendingUp size={12} /> Sleep Trends
            </h3>
            <div className="flex gap-1">
              {(['7d', '14d', '30d', 'all'] as const).map(r => (
                <button key={r} onClick={() => setChartRange(r)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer
                    ${chartRange === r ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-secondary hover:bg-glass-strong'}`}>
                  {r === 'all' ? 'All' : r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {chartData.length > 1 ? (<>
          {/* Hours Area Chart */}
          <div className="h-[200px] mb-2" key={chartRange}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sleepHoursGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="date" stroke="rgba(255,255,255,0.15)" fontSize={10}
                  tickLine={false} axisLine={false}
                  interval="preserveStartEnd"
                  tickFormatter={(v) => { try { return format(parseISO(v), 'MMM d') } catch { return v } }}
                />
                <YAxis
                  domain={[0, 12]} stroke="rgba(255,255,255,0.15)"
                  fontSize={10} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `${v}h`}
                />
                <ReferenceLine
                  y={8} stroke="rgba(74,222,128,0.2)" strokeDasharray="4 4"
                  label={{ value: '8h goal', position: 'insideTopRight', fill: 'rgba(74,222,128,0.35)', fontSize: 10 }}
                />
                <ReferenceLine
                  y={avgHoursLine} stroke="rgba(96,165,250,0.25)" strokeDasharray="4 4"
                  label={{ value: `avg ${avgHoursLine.toFixed(1)}h`, position: 'insideTopLeft', fill: 'rgba(96,165,250,0.4)', fontSize: 10 }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0]?.payload
                    if (!d) return null
                    let dateLabel = d.date
                    try { dateLabel = format(parseISO(d.date), 'EEEE, MMM d') } catch { /* */ }
                    return (
                      <div className="bg-[rgba(10,10,10,0.96)] border border-glass-border rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl">
                        <p className="text-[10px] text-text-muted mb-2">{dateLabel}</p>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          <span className="text-sm font-semibold text-text-primary">{d.hours}h sleep</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: QUALITY_BAR_COLORS[d.quality] }} />
                          <span className="text-xs text-text-secondary">{QUALITY_LABELS[d.quality]} ({d.quality}/5)</span>
                        </div>
                        <div className="text-[10px] text-text-muted mt-2 flex items-center gap-3">
                          <span>🛏 {d.bedtime}</span>
                          <span>☀️ {d.waketime}</span>
                        </div>
                      </div>
                    )
                  }}
                />
                <Area
                  type="monotone" dataKey="hours"
                  stroke="#60a5fa" strokeWidth={2.5} fill="url(#sleepHoursGrad)"
                  dot={false}
                  activeDot={{ r: 5, stroke: '#60a5fa', strokeWidth: 2, fill: '#0a0a0a' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quality Bar Chart */}
          <div className="h-[60px]" key={`q-${chartRange}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" hide />
                <YAxis domain={[0, 5]} hide />
                <Bar dataKey="quality" radius={[3, 3, 0, 0]} maxBarSize={20}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={QUALITY_BAR_COLORS[d.quality]} opacity={0.6} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-5 mt-3 pt-3 border-t border-glass-border">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full bg-blue-400" />
              <span className="text-[10px] text-text-muted">Hours</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full bg-accent" />
              <span className="text-[10px] text-text-muted">Quality</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[1px] border-t border-dashed border-green-soft/40" />
              <span className="text-[10px] text-text-muted">8h Goal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-[1px] border-t border-dashed border-blue-400/40" />
              <span className="text-[10px] text-text-muted">Avg</span>
            </div>
          </div>
          </>) : (
            <div className="text-center py-8 text-text-muted text-xs">
              Not enough data for this range. Try a wider range.
            </div>
          )}
        </div>
      )}

      {/* Add Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="card border-accent/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Log Sleep</h3>
                <button onClick={() => { setBedtime('23:00'); setWaketime('07:00'); setQuality(3); setNotes(''); setShowAdd(false) }} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
              </div>
              <div className="mb-3">
                <DatePicker value={selectedDate} onChange={setSelectedDate} label="Date" />
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div><label className="text-xs text-text-secondary uppercase block mb-1">Bedtime</label>
                  <input type="time" value={bedtime} onChange={e => setBedtime(e.target.value)} className="input text-xs" /></div>
                <div><label className="text-xs text-text-secondary uppercase block mb-1">Wake Time</label>
                  <input type="time" value={waketime} onChange={e => setWaketime(e.target.value)} className="input text-xs" /></div>
              </div>
              <div className="mb-3">
                <label className="text-xs text-text-secondary uppercase block mb-2">Sleep Quality</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(q => (
                    <button key={q} onClick={() => setQuality(q)}
                      className={`flex-1 py-2 rounded-lg text-xs transition-all ${
                        quality === q ? 'bg-accent/20 text-accent font-medium' : 'bg-bg-elevated text-text-muted hover:bg-bg-hover'
                      }`}>{QUALITY_LABELS[q]}</button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-text-muted mb-3">Estimated: {calcHours(bedtime, waketime)}h of sleep</p>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" className="input w-full mb-4 text-xs" />
              <button onClick={handleAdd} className="btn w-full">Save</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log List */}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : logs.length === 0 ? (
        <div className="text-center py-16 card"><p className="text-sm text-text-muted">No sleep data yet</p></div>
      ) : (
        <div className="space-y-1.5">
          {logs.filter(l => l.date === selectedDate).length > 0 ? (
            logs.filter(l => l.date === selectedDate).map(log => (
              <div key={log._id} className="card group flex items-center gap-3 border-accent/20">
                <div className="w-10 h-10 rounded-lg bg-blue-soft/10 flex items-center justify-center shrink-0">
                  <Moon className="w-4 h-4 text-blue-soft" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium">{formatDate(log.date)}</p>
                    <span className={`text-xs font-medium ${QUALITY_COLORS[log.quality]}`}>{QUALITY_LABELS[log.quality]}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
                    <span>{log.bedtime} → {log.waketime}</span>
                    <span className="text-accent font-medium">{log.hours}h</span>
                  </div>
                  {log.notes && <p className="text-xs text-text-muted mt-0.5">{log.notes}</p>}
                </div>
                <button onClick={() => { if (confirm('Delete this sleep log?')) deleteLog(log._id).catch(() => toast.error('Failed to delete')) }} className="text-text-muted hover:text-red-soft md:opacity-0 md:group-hover:opacity-100 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
          ) : (
            <div className="card text-center py-6 text-text-muted text-xs">No sleep log for {formatDate(selectedDate)}</div>
          )}

          {/* Recent logs */}
          {logs.some(l => l.date !== selectedDate) && (
            <>
              <p className="text-[10px] uppercase text-text-muted tracking-wider mt-4 mb-2">Recent Logs</p>
              {logs.filter(l => l.date !== selectedDate).slice(0, 7).map(log => (
                <div key={log._id} className="card group flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-soft/10 flex items-center justify-center shrink-0">
                    <Moon className="w-4 h-4 text-blue-soft" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium">{formatDate(log.date)}</p>
                      <span className={`text-xs font-medium ${QUALITY_COLORS[log.quality]}`}>{QUALITY_LABELS[log.quality]}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
                      <span>{log.bedtime} → {log.waketime}</span>
                      <span className="text-accent font-medium">{log.hours}h</span>
                    </div>
                    {log.notes && <p className="text-xs text-text-muted mt-0.5">{log.notes}</p>}
                  </div>
                  <button onClick={() => { if (confirm('Delete this sleep log?')) deleteLog(log._id).catch(() => toast.error('Failed to delete')) }} className="text-text-muted hover:text-red-soft md:opacity-0 md:group-hover:opacity-100 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
