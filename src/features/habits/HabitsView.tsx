'use client'

import { useEffect, useState } from 'react'
import { useHabitsStore } from '@/store'
import { toISODate, getStreakEmoji } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, Flame } from 'lucide-react'

const COLORS = ['#FACC15', '#22C55E', '#3B82F6', '#A855F7', '#EC4899', '#F97316', '#06B6D4', '#EF4444']
const ICONS = ['⚡', '🔥', '💧', '📚', '🧘', '💪', '🏃', '🎯', '💤', '🥗', '💊', '✍️', '🧠', '🎵']

export function HabitsView() {
  const { habits, isLoading, fetchHabits, addHabit, toggleHabit, deleteHabit } = useHabitsStore()
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('⚡')
  const [newColor, setNewColor] = useState(COLORS[0])
  const today = toISODate()

  useEffect(() => { fetchHabits().catch(() => {}) }, [fetchHabits])

  const handleAdd = async () => {
    if (!newName.trim()) return
    await addHabit({ name: newName, icon: newIcon, color: newColor })
    setNewName('')
    setShowAdd(false)
  }

  const handleToggle = async (id: string) => {
    await toggleHabit(id, today)
  }

  // Generate last 30 days for heatmap
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return toISODate(d)
  })

  const completedToday = habits.filter((h) => h.completedDates.includes(today)).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight flex items-center gap-2">
            <Flame className="w-6 h-6 text-brutal-yellow" />
            Habits
          </h1>
          <p className="text-text-muted font-mono text-sm mt-1">
            {completedToday}/{habits.length} completed today
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="brutal-btn flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {/* Add Habit Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="border-3 border-brutal-yellow bg-bg-surface p-4 shadow-brutal">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider">New Habit</h3>
                <button onClick={() => setShowAdd(false)} className="text-text-muted hover:text-text-primary">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Habit name..."
                className="brutal-input w-full mb-3"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                autoFocus
              />

              {/* Icon picker */}
              <div className="mb-3">
                <label className="font-mono text-[10px] text-text-muted uppercase tracking-widest block mb-1">Icon</label>
                <div className="flex gap-2 flex-wrap">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewIcon(icon)}
                      className={`w-8 h-8 flex items-center justify-center border-2 text-lg transition-all ${
                        newIcon === icon ? 'border-brutal-yellow bg-brutal-yellow/10 scale-110' : 'border-border hover:border-text-muted'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div className="mb-4">
                <label className="font-mono text-[10px] text-text-muted uppercase tracking-widest block mb-1">Color</label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewColor(color)}
                      className={`w-6 h-6 border-2 transition-all ${
                        newColor === color ? 'border-white scale-125' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <button onClick={handleAdd} className="brutal-btn w-full">Create Habit</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Habits List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="font-mono text-sm text-text-muted animate-pulse">Loading habits...</p>
        </div>
      ) : habits.length === 0 ? (
        <div className="text-center py-16 border-3 border-dashed border-border">
          <p className="font-mono text-sm text-text-muted mb-2">No habits yet</p>
          <p className="font-mono text-xs text-text-muted">Start building your daily routine</p>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const isDone = habit.completedDates.includes(today)
            return (
              <motion.div
                key={habit._id}
                layout
                className={`border-3 bg-bg-surface p-4 transition-all ${
                  isDone ? 'border-brutal-green shadow-brutal-green' : 'border-border hover:border-text-muted'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Toggle Button */}
                  <button
                    onClick={() => handleToggle(habit._id)}
                    className={`w-10 h-10 border-3 flex items-center justify-center text-xl transition-all ${
                      isDone
                        ? 'border-brutal-green bg-brutal-green text-white'
                        : 'border-border-strong hover:border-brutal-yellow'
                    }`}
                  >
                    {isDone ? (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      >
                        ✓
                      </motion.span>
                    ) : (
                      habit.icon
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className={`font-mono text-sm font-bold ${isDone ? 'line-through text-text-muted' : ''}`}>
                      {habit.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="font-mono text-[10px] text-text-muted uppercase">
                        {getStreakEmoji(habit.streak)} {habit.streak} day streak
                      </span>
                      <span className="font-mono text-[10px] text-text-muted">
                        Best: {habit.bestStreak}
                      </span>
                    </div>
                  </div>

                  {/* Mini Heatmap */}
                  <div className="hidden md:flex items-center gap-[2px]">
                    {last30Days.slice(-14).map((date) => {
                      const completed = habit.completedDates.includes(date)
                      return (
                        <div
                          key={date}
                          className="w-2.5 h-2.5 border border-border/50"
                          style={{ backgroundColor: completed ? habit.color : '#1a1a1a' }}
                          title={date}
                        />
                      )
                    })}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => deleteHabit(habit._id)}
                    className="text-text-muted hover:text-brutal-red transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Full Heatmap */}
      {habits.length > 0 && (
        <div className="mt-8 border-3 border-border bg-bg-surface p-4">
          <h3 className="font-mono text-xs uppercase tracking-widest text-text-muted mb-3">
            Activity Heatmap — Last 30 Days
          </h3>
          <div className="space-y-1.5">
            {habits.map((habit) => (
              <div key={habit._id} className="flex items-center gap-2">
                <span className="w-6 text-center text-sm">{habit.icon}</span>
                <div className="flex gap-[2px] flex-1">
                  {last30Days.map((date) => (
                    <div
                      key={date}
                      className="flex-1 h-4 border border-border/30 min-w-[6px]"
                      style={{
                        backgroundColor: habit.completedDates.includes(date) ? habit.color : '#111',
                        opacity: habit.completedDates.includes(date) ? 1 : 0.3,
                      }}
                      title={`${habit.name} — ${date}`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
