'use client'

import { useEffect, useState, useMemo } from 'react'
import { useWorkoutsStore, type Exercise, type ExerciseSet } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, Dumbbell, Clock, TrendingUp, Trophy, ChevronDown, ChevronUp, Search } from 'lucide-react'

const EXERCISES = [
  'Bench Press', 'Incline Bench Press', 'Dumbbell Press', 'Overhead Press',
  'Squat', 'Deadlift', 'Romanian Deadlift', 'Leg Press', 'Lunges',
  'Barbell Row', 'Pull-Up', 'Lat Pulldown', 'Cable Row',
  'Bicep Curl', 'Tricep Pushdown', 'Lateral Raise', 'Face Pull',
  'Hip Thrust', 'Calf Raise', 'Plank',
]

export function GymView() {
  const { workouts, isLoading, fetchWorkouts, addWorkout, deleteWorkout } = useWorkoutsStore()
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [duration, setDuration] = useState(60)
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<{ name: string; sets: ExerciseSet[]; notes: string }[]>([])
  const [searchEx, setSearchEx] = useState('')
  const [showExSearch, setShowExSearch] = useState(false)
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)
  const today = toISODate()

  useEffect(() => { fetchWorkouts().catch(() => {}) }, [fetchWorkouts])

  const todayWorkouts = workouts.filter((w) => w.date === today)
  const totalVolume = todayWorkouts.reduce((s, w) => s + w.exercises.reduce((se, ex) =>
    se + ex.sets.reduce((ss, set) => ss + set.reps * set.weight, 0), 0), 0)
  const totalDuration = todayWorkouts.reduce((s, w) => s + w.duration, 0)
  const totalSets = todayWorkouts.reduce((s, w) => s + w.exercises.reduce((se, ex) => se + ex.sets.length, 0), 0)

  // PRs
  const personalRecords = useMemo(() => {
    const prs: Record<string, { weight: number; reps: number; date: string }> = {}
    workouts.forEach(w => {
      w.exercises.forEach(ex => {
        ex.sets.forEach(set => {
          if (!prs[ex.name] || set.weight > prs[ex.name].weight) {
            prs[ex.name] = { weight: set.weight, reps: set.reps, date: w.date }
          }
        })
      })
    })
    return Object.entries(prs).sort((a, b) => b[1].weight - a[1].weight)
  }, [workouts])

  // Weekly volume
  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return toISODate(d)
  }), [])

  const weeklyVolume = useMemo(() => last7Days.map(date => {
    const dayWorkouts = workouts.filter(w => w.date === date)
    return dayWorkouts.reduce((s, w) => s + w.exercises.reduce((se, ex) =>
      se + ex.sets.reduce((ss, set) => ss + set.reps * set.weight, 0), 0), 0)
  }), [last7Days, workouts])

  const weeklyWorkoutCount = workouts.filter(w => last7Days.includes(w.date)).length
  const maxWeekVol = Math.max(1, ...weeklyVolume)

  const filteredExercises = EXERCISES.filter(e => e.toLowerCase().includes(searchEx.toLowerCase()))

  const addExercise = (exName: string) => {
    setExercises([...exercises, { name: exName, sets: [{ reps: 10, weight: 0, unit: 'kg' }], notes: '' }])
    setSearchEx('')
    setShowExSearch(false)
  }

  const updateSet = (exIdx: number, setIdx: number, field: 'reps' | 'weight', value: number) => {
    const updated = [...exercises]
    updated[exIdx].sets[setIdx] = { ...updated[exIdx].sets[setIdx], [field]: value }
    setExercises(updated)
  }

  const addSet = (exIdx: number) => {
    const updated = [...exercises]
    const lastSet = updated[exIdx].sets[updated[exIdx].sets.length - 1]
    updated[exIdx].sets.push({ ...lastSet })
    setExercises(updated)
  }

  const removeSet = (exIdx: number, setIdx: number) => {
    const updated = [...exercises]
    updated[exIdx].sets.splice(setIdx, 1)
    if (updated[exIdx].sets.length === 0) updated.splice(exIdx, 1)
    setExercises(updated)
  }

  const removeExercise = (exIdx: number) => {
    setExercises(exercises.filter((_, i) => i !== exIdx))
  }

  const handleSave = async () => {
    if (!name.trim() || exercises.length === 0) return
    await addWorkout({ date: today, name, exercises, duration, notes })
    setName('')
    setDuration(60)
    setNotes('')
    setExercises([])
    setShowAdd(false)
  }

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-accent" /> Gym
          </h1>
          <p className="text-text-muted text-sm mt-1">{todayWorkouts.length} workout{todayWorkouts.length !== 1 ? 's' : ''} today · {totalVolume.toLocaleString()}kg volume</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn flex items-center gap-2"><Plus className="w-4 h-4" /> Log Workout</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card"><Dumbbell className="w-4 h-4 text-green-soft mb-1" /><p className="text-xl font-bold text-text-primary">{todayWorkouts.length}</p><p className="text-[10px] text-text-muted">Today&apos;s workouts</p></div>
        <div className="card"><TrendingUp className="w-4 h-4 text-blue-soft mb-1" /><p className="text-xl font-bold text-text-primary">{totalVolume.toLocaleString()}</p><p className="text-[10px] text-text-muted">Volume (kg)</p></div>
        <div className="card"><Clock className="w-4 h-4 text-purple-soft mb-1" /><p className="text-xl font-bold text-text-primary">{totalDuration}</p><p className="text-[10px] text-text-muted">Minutes</p></div>
        <div className="card"><Trophy className="w-4 h-4 text-accent mb-1" /><p className="text-xl font-bold text-text-primary">{totalSets}</p><p className="text-[10px] text-text-muted">Total sets</p></div>
      </div>

      {/* Weekly Volume Chart */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-text-muted">Weekly Volume</span>
          <span className="text-xs text-text-muted">{weeklyWorkoutCount} workouts</span>
        </div>
        <div className="flex items-end gap-2 h-20">
          {weeklyVolume.map((vol, i) => {
            const pct = (vol / maxWeekVol) * 100
            const isToday = last7Days[i] === today
            const dayIdx = new Date(last7Days[i] + 'T12:00:00').getDay()
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                {vol > 0 && <span className="text-[9px] text-text-muted">{(vol / 1000).toFixed(1)}k</span>}
                <div className="w-full bg-bg-elevated rounded-sm overflow-hidden" style={{ height: '48px' }}>
                  <div className={`w-full rounded-sm ${isToday ? 'bg-blue-soft' : 'bg-blue-soft/30'}`}
                    style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                </div>
                <span className={`text-[10px] ${isToday ? 'text-blue-soft font-bold' : 'text-text-muted'}`}>{dayNames[dayIdx]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Workout */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="card border-accent/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Log Workout</h3>
                <button onClick={() => setShowAdd(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Workout name" className="input col-span-2" />
                <div>
                  <label className="text-[10px] text-text-muted uppercase block mb-1">Duration (min)</label>
                  <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="input" />
                </div>
                <div className="relative">
                  <label className="text-[10px] text-text-muted uppercase block mb-1">Add Exercise</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                    <input type="text" value={searchEx} onChange={(e) => { setSearchEx(e.target.value); setShowExSearch(true) }}
                      onFocus={() => setShowExSearch(true)} placeholder="Search exercises..." className="input pl-9" />
                  </div>
                  {showExSearch && searchEx && (
                    <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-bg-elevated border border-border rounded-lg shadow-card max-h-40 overflow-y-auto">
                      {filteredExercises.map(ex => (
                        <button key={ex} onClick={() => addExercise(ex)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-bg-hover transition-colors">{ex}</button>
                      ))}
                      {searchEx && !EXERCISES.includes(searchEx) && (
                        <button onClick={() => addExercise(searchEx)}
                          className="w-full text-left px-3 py-2 text-sm text-accent hover:bg-bg-hover">+ Add &quot;{searchEx}&quot;</button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Exercises */}
              {exercises.map((ex, exIdx) => {
                const pr = personalRecords.find(([name]) => name === ex.name)
                return (
                  <div key={exIdx} className="bg-bg-elevated rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-xs font-medium">{ex.name}</h4>
                        {pr && <span className="text-[10px] text-accent">PR: {pr[1].weight}kg × {pr[1].reps}</span>}
                      </div>
                      <button onClick={() => removeExercise(exIdx)} className="text-text-muted hover:text-red-soft"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-[10px] text-text-muted uppercase mb-1">
                      <span className="w-8">Set</span><span>Weight (kg)</span><span>Reps</span><span className="w-6" />
                    </div>
                    {ex.sets.map((set, setIdx) => (
                      <div key={setIdx} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 mb-1 items-center">
                        <span className="w-8 text-xs text-text-muted">{setIdx + 1}</span>
                        <input type="number" value={set.weight || ''} onChange={(e) => updateSet(exIdx, setIdx, 'weight', Number(e.target.value))} className="input text-xs py-1" placeholder="kg" />
                        <input type="number" value={set.reps || ''} onChange={(e) => updateSet(exIdx, setIdx, 'reps', Number(e.target.value))} className="input text-xs py-1" placeholder="reps" />
                        <button onClick={() => removeSet(exIdx, setIdx)} className="w-6 text-text-muted hover:text-red-soft"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                    <button onClick={() => addSet(exIdx)} className="w-full mt-1 py-1 text-[10px] text-text-muted hover:text-accent transition-colors border border-dashed border-border rounded-lg">+ Add Set</button>
                  </div>
                )
              })}

              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Workout notes..." className="input w-full h-16 resize-none mb-3" />
              <button onClick={handleSave} className="btn w-full" disabled={!name.trim() || exercises.length === 0}>
                {exercises.length === 0 ? 'Add exercises first' : `Save Workout (${exercises.length} exercises)`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PRs */}
      {personalRecords.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-2"><Trophy className="w-3.5 h-3.5 text-accent" /> Personal Records</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {personalRecords.slice(0, 8).map(([name, pr]) => (
              <div key={name} className="bg-bg-elevated rounded-lg p-2.5">
                <p className="text-xs text-text-secondary truncate">{name}</p>
                <p className="text-lg font-bold text-accent">{pr.weight}kg</p>
                <p className="text-[10px] text-text-muted">{pr.reps} reps</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workout History */}
      {isLoading ? (
        <div className="text-center py-12"><p className="text-sm text-text-muted animate-pulse">Loading workouts...</p></div>
      ) : workouts.length === 0 ? (
        <div className="text-center py-16 card"><p className="text-sm text-text-muted">No workouts yet</p></div>
      ) : (
        <div className="space-y-2">
          {workouts.map((w) => {
            const vol = w.exercises.reduce((s, ex) => s + ex.sets.reduce((ss, set) => ss + set.reps * set.weight, 0), 0)
            const isExpanded = expandedWorkout === w._id
            return (
              <div key={w._id} className="card group">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedWorkout(isExpanded ? null : w._id)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-text-primary">{w.name}</h3>
                      <span className="badge text-[10px]">{w.date === today ? 'Today' : formatDate(w.date)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-text-muted">
                      <span>{w.exercises.length} exercises</span>
                      <span>{w.exercises.reduce((s, e) => s + e.sets.length, 0)} sets</span>
                      <span>{vol.toLocaleString()}kg vol</span>
                      <span>{w.duration}min</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                  <button onClick={(e) => { e.stopPropagation(); deleteWorkout(w._id) }}
                    className="text-text-muted hover:text-red-soft transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                {isExpanded && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 pt-3 border-t border-border space-y-2">
                    {w.exercises.map((ex, i) => (
                      <div key={i} className="bg-bg-elevated rounded-lg p-2.5">
                        <p className="text-xs font-medium mb-1">{ex.name}</p>
                        <div className="space-y-0.5">
                          {ex.sets.map((set, si) => (
                            <div key={si} className="flex items-center gap-2 text-[10px] text-text-muted">
                              <span className="w-6">#{si + 1}</span>
                              <span>{set.weight}kg × {set.reps}</span>
                              <span className="text-text-muted/50">= {set.weight * set.reps}kg</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {w.notes && <p className="text-xs text-text-muted italic">{w.notes}</p>}
                  </motion.div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
