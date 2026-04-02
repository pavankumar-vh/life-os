'use client'

import { useEffect, useMemo, useState } from 'react'
import { useWaterStore, useSettingsStore } from '@/store'
import { toISODate } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Droplets, Plus, Minus, TrendingUp, Award } from 'lucide-react'
import { DateNavigator } from '@/components/DateNavigator'
import { toast } from '@/components/Toast'

export function WaterTrackerView() {
  const { logs, isLoading, fetchLogs, logWater } = useWaterStore()

  useEffect(() => { fetchLogs().catch(() => toast.error('Failed to load water logs')) }, [fetchLogs])

  const [selectedDate, setSelectedDate] = useState(toISODate())
  const today = toISODate()
  const userGoals = useSettingsStore(s => s.goals)
  const todayLog = logs.find(l => l.date === selectedDate) || { _id: '', date: selectedDate, glasses: 0, goal: userGoals.water }
  const percentage = Math.min((todayLog.glasses / todayLog.goal) * 100, 100)
  const isComplete = todayLog.glasses >= todayLog.goal

  const weekLogs = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const date = toISODate(d)
      const log = logs.find(l => l.date === date)
      return { date, day: d.toLocaleDateString('en', { weekday: 'short' }), glasses: log?.glasses || 0, goal: log?.goal || 8 }
    })
  }, [logs])

  const stats = useMemo(() => {
    const weekData = weekLogs.filter(l => l.glasses > 0)
    const avg = weekData.length > 0 ? +(weekData.reduce((s, l) => s + l.glasses, 0) / weekData.length).toFixed(1) : 0
    const daysHitGoal = weekData.filter(l => l.glasses >= l.goal).length
    const streak = (() => {
      let s = 0
      for (let i = logs.length - 1; i >= 0; i--) {
        if (logs[i].glasses >= logs[i].goal) s++
        else break
      }
      return s
    })()
    return { avg, daysHitGoal, streak }
  }, [weekLogs, logs])

  const handleAdd = () => {
    logWater({ date: selectedDate, glasses: todayLog.glasses + 1, goal: todayLog.goal }).catch(() => toast.error('Failed to log water'))
  }

  const handleRemove = () => {
    if (todayLog.glasses <= 0) return
    logWater({ date: selectedDate, glasses: todayLog.glasses - 1, goal: todayLog.goal }).catch(() => toast.error('Failed to log water'))
  }

  // SVG circle animation
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Droplets className="w-6 h-6 text-blue-soft" /> Water Tracker
        </h1>
        <DateNavigator value={selectedDate} onChange={setSelectedDate} />
      </div>

      {/* Main Circle */}
      <div className="card mb-6 flex flex-col items-center py-8">
        <div className="relative w-48 h-48">
          <svg className="w-48 h-48 -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
            <motion.circle
              cx="100" cy="100" r={radius} fill="none"
              stroke={isComplete ? '#4ade80' : '#60a5fa'}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Droplets size={36} className="text-blue-soft" />
            <p className="text-3xl font-bold text-text-primary mt-1">{todayLog.glasses}</p>
            <p className="text-xs text-text-muted">of {todayLog.goal} glasses</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-6">
          <button onClick={handleRemove} className="w-12 h-12 rounded-xl bg-bg-elevated hover:bg-bg-hover flex items-center justify-center transition-colors">
            <Minus className="w-5 h-5 text-text-muted" />
          </button>
          <button onClick={handleAdd} className="w-16 h-16 rounded-2xl bg-blue-soft/20 hover:bg-blue-soft/30 flex items-center justify-center transition-colors border border-blue-soft/20">
            <Plus className="w-7 h-7 text-blue-soft" />
          </button>

        </div>

        {isComplete && (
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-green-soft text-xs mt-4 font-medium">
            <Award size={16} className="text-green-soft mr-1" /> Goal reached! Great job staying hydrated!
          </motion.p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-soft">{stats.avg}</p>
          <p className="text-[11px] text-text-secondary">Avg/Day</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-soft">{stats.daysHitGoal}/7</p>
          <p className="text-[11px] text-text-secondary">Goal Days</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-accent">{stats.streak}</p>
          <p className="text-[11px] text-text-secondary">Streak</p>
        </div>
      </div>

      {/* Week Chart */}
      <div className="card">
        <h3 className="text-xs font-medium text-text-muted mb-4 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-blue-soft" /> This Week</h3>
        <div className="flex items-end justify-between gap-2 h-32">
          {weekLogs.map(l => {
            const h = l.goal > 0 ? (l.glasses / l.goal) * 100 : 0
            const isToday = l.date === today
            return (
              <div key={l.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[11px] text-text-secondary">{l.glasses}</span>
                <div className="w-full bg-bg-elevated rounded-t-lg relative" style={{ height: '80px' }}>
                  <motion.div
                    className={`absolute bottom-0 w-full rounded-t-lg ${l.glasses >= l.goal ? 'bg-blue-soft' : 'bg-blue-soft/40'}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.min(h, 100)}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  />
                  {/* Goal line */}
                  <div className="absolute w-full border-t border-dashed border-blue-soft/30" style={{ bottom: '100%' }} />
                </div>
                <span className={`text-[11px] ${isToday ? 'text-blue-soft font-medium' : 'text-text-muted'}`}>{l.day}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
