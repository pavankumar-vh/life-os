'use client'

import { useEffect, useState, useMemo } from 'react'
import { useHabitsStore } from '@/store'
import { toISODate } from '@/lib/utils'
import { HABIT_ICONS, HabitIcon, StreakIcon } from '@/lib/icons'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, Flame, Calendar, TrendingUp, Award, BarChart3, Check } from 'lucide-react'

const COLORS = ['#e8d5b7', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6', '#fb923c', '#22d3ee', '#f87171']

export function HabitsView() {
  const { habits, isLoading, fetchHabits, addHabit, toggleHabit, deleteHabit } = useHabitsStore()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('zap')
  const [newColor, setNewColor] = useState(COLORS[0])
  const [filter, setFilter] = useState<'all' | 'done' | 'pending'>('all')
  const today = toISODate()

  useEffect(() => { fetchHabits().catch(() => {}) }, [fetchHabits])

  const handleAdd = async () => {
    if (!newName.trim()) return
    await addHabit({ name: newName, icon: newIcon, color: newColor })
    setNewName('')
    setNewIcon('zap')
    setNewColor(COLORS[0])
    setShowAdd(false)
  }

  const last30Days = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i)); return toISODate(d)
  }), [])

  const last7Days = useMemo(() => last30Days.slice(-7), [last30Days])

  const completedToday = habits.filter((h) => h.completedDates.includes(today)).length
  const totalHabits = habits.length
  const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0
  const bestStreak = Math.max(0, ...habits.map(h => h.bestStreak))
  const currentStreaks = habits.reduce((s, h) => s + h.streak, 0)
  const totalCompletions = habits.reduce((s, h) => s + h.completedDates.length, 0)

  // Weekly completion rates
  const weeklyRate = useMemo(() => {
    if (totalHabits === 0) return 0
    const total = last7Days.length * totalHabits
    const done = last7Days.reduce((s, d) => s + habits.filter(h => h.completedDates.includes(d)).length, 0)
    return Math.round((done / total) * 100)
  }, [last7Days, habits, totalHabits])

  const filteredHabits = habits.filter(h => {
    if (filter === 'done') return h.completedDates.includes(today)
    if (filter === 'pending') return !h.completedDates.includes(today)
    return true
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Flame className="w-6 h-6 text-accent" /> Habits
          </h1>
          <p className="text-text-muted text-sm mt-1">{completedToday}/{totalHabits} completed today · {completionRate}%</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn flex items-center gap-2"><Plus className="w-4 h-4" /> New Habit</button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Today', value: `${completionRate}%`, sub: `${completedToday}/${totalHabits}`, icon: Calendar, color: 'text-accent' },
          { label: 'Best Streak', value: `${bestStreak}d`, sub: 'personal best', icon: Award, color: 'text-orange-soft' },
          { label: 'This Week', value: `${weeklyRate}%`, sub: 'avg completion', icon: BarChart3, color: 'text-blue-soft' },
          { label: 'Total Done', value: totalCompletions.toString(), sub: `${currentStreaks} active streaks`, icon: TrendingUp, color: 'text-green-soft' },
        ].map(s => (
          <div key={s.label} className="card">
            <s.icon className={`w-4 h-4 ${s.color} mb-1`} />
            <p className="text-xl font-bold text-text-primary">{s.value}</p>
            <p className="text-[10px] text-text-muted">{s.sub}</p>
            <p className="text-[10px] text-text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(['all', 'pending', 'done'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === f ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
            }`}>{f === 'all' ? `All (${totalHabits})` : f === 'done' ? `Done (${completedToday})` : `Pending (${totalHabits - completedToday})`}</button>
        ))}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="card border-accent/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">New Habit</h3>
                <button onClick={() => setShowAdd(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
              </div>
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Meditate for 10 minutes"
                className="input w-full mb-3" onKeyDown={(e) => e.key === 'Enter' && handleAdd()} autoFocus />
              <div className="mb-3">
                <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1.5">Icon</label>
                <div className="flex gap-1.5 flex-wrap">
                  {HABIT_ICONS.map((item) => (
                    <button key={item.id} onClick={() => setNewIcon(item.id)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                        newIcon === item.id ? 'bg-accent/20 ring-2 ring-accent scale-110' : 'bg-bg-elevated hover:bg-bg-hover'
                      }`} title={item.label}><item.icon size={16} /></button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1.5">Color</label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button key={color} onClick={() => setNewColor(color)}
                      className={`w-7 h-7 rounded-full transition-all ${newColor === color ? 'ring-2 ring-white scale-125' : 'opacity-60 hover:opacity-100'}`}
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              <button onClick={handleAdd} className="btn w-full">Create Habit</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Habits List */}
      {isLoading ? (
        <div className="text-center py-12"><p className="text-sm text-text-muted animate-pulse">Loading habits...</p></div>
      ) : filteredHabits.length === 0 ? (
        <div className="text-center py-16 card">
          <p className="text-sm text-text-muted mb-2">{filter === 'all' ? 'No habits yet' : filter === 'done' ? 'Nothing completed yet' : 'All done!'}</p>
          {filter === 'all' && <p className="text-xs text-text-muted">Create your first habit to start tracking</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredHabits.map((habit) => {
            const isDone = habit.completedDates.includes(today)
            const completionCount = last30Days.filter(d => habit.completedDates.includes(d)).length
            const rate30 = Math.round((completionCount / 30) * 100)
            return (
              <motion.div key={habit._id} layout className={`card group transition-all ${isDone ? 'border-green-soft/30' : 'hover:border-border-strong'}`}>
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleHabit(habit._id, today)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all shrink-0 ${
                      isDone ? 'bg-green-soft/20 ring-2 ring-green-soft' : 'bg-bg-elevated hover:bg-bg-hover'
                    }`}>
                    {isDone ? <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 20 }}><Check size={18} className="text-green-soft" /></motion.span> : <HabitIcon iconId={habit.icon} size={20} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-medium ${isDone ? 'line-through text-text-muted' : 'text-text-primary'}`}>{habit.name}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-text-muted flex items-center gap-0.5"><StreakIcon streak={habit.streak} /> {habit.streak}d streak</span>
                      <span className="text-[10px] text-text-muted">Best: {habit.bestStreak}d</span>
                      <span className="text-[10px] text-text-muted">{rate30}% / 30d</span>
                    </div>
                  </div>
                  {/* Mini heatmap */}
                  <div className="hidden md:flex items-center gap-[2px]">
                    {last30Days.slice(-14).map((date) => (
                      <div key={date} className="w-2.5 h-2.5 rounded-[2px]"
                        style={{ backgroundColor: habit.completedDates.includes(date) ? habit.color : '#1f1f1f' }} title={date} />
                    ))}
                  </div>
                  <button onClick={() => deleteHabit(habit._id)}
                    className="text-text-muted hover:text-red-soft transition-colors p-1 opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Activity Heatmap */}
      {habits.length > 0 && (
        <div className="card mt-8">
          <h3 className="text-xs font-medium text-text-muted mb-4 flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5" /> 30-Day Activity
          </h3>
          <div className="space-y-2">
            {habits.map((habit) => (
              <div key={habit._id} className="flex items-center gap-3">
                <span className="w-6 flex items-center justify-center shrink-0"><HabitIcon iconId={habit.icon} size={14} /></span>
                <span className="text-xs text-text-muted w-20 truncate shrink-0">{habit.name}</span>
                <div className="flex gap-[2px] flex-1">
                  {last30Days.map((date) => (
                    <div key={date} className="h-3 flex-1 rounded-[1px] min-w-[4px]"
                      style={{ backgroundColor: habit.completedDates.includes(date) ? habit.color : '#1f1f1f' }} title={`${date}: ${habit.completedDates.includes(date) ? 'done' : 'missed'}`} />
                  ))}
                </div>
                <span className="text-[10px] text-text-muted w-8 text-right shrink-0">
                  {Math.round((last30Days.filter(d => habit.completedDates.includes(d)).length / 30) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
