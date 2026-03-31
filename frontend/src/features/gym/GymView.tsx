'use client'

import { useEffect, useState, useMemo } from 'react'
import { useWorkoutsStore, useBodyTrackerStore, type ExerciseSet, type BodyLogData } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { ListSkeleton } from '@/components/Skeletons'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, X, Dumbbell, Clock, TrendingUp,
  Trophy, ChevronDown, ChevronUp, Search, Ruler, Flame, Target,
  Calendar, BarChart3, Activity, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar, Cell
} from 'recharts'
import { DateNavigator } from '@/components/DateNavigator'
import { toast } from '@/components/Toast'

const EXERCISES = [
  'Bench Press', 'Incline Bench Press', 'Dumbbell Press', 'Overhead Press',
  'Squat', 'Deadlift', 'Romanian Deadlift', 'Leg Press', 'Lunges',
  'Barbell Row', 'Pull-Up', 'Lat Pulldown', 'Cable Row',
  'Bicep Curl', 'Tricep Pushdown', 'Lateral Raise', 'Face Pull',
  'Hip Thrust', 'Calf Raise', 'Plank',
]

const MUSCLE_GROUPS: Record<string, string[]> = {
  Chest: ['Bench Press', 'Incline Bench Press', 'Dumbbell Press'],
  Back: ['Barbell Row', 'Pull-Up', 'Lat Pulldown', 'Cable Row', 'Face Pull'],
  Legs: ['Squat', 'Deadlift', 'Romanian Deadlift', 'Leg Press', 'Lunges', 'Hip Thrust', 'Calf Raise'],
  Shoulders: ['Overhead Press', 'Lateral Raise', 'Face Pull'],
  Arms: ['Bicep Curl', 'Tricep Pushdown'],
  Core: ['Plank'],
}

const MEASUREMENT_FIELDS = [
  { key: 'chest', label: 'Chest' },
  { key: 'arms', label: 'Arms' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'forearms', label: 'Forearms' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'thighs', label: 'Thighs' },
  { key: 'calves', label: 'Calves' },
  { key: 'neck', label: 'Neck' },
] as const

type Tab = 'workouts' | 'measurements' | 'progress'
type MeasurementKey = typeof MEASUREMENT_FIELDS[number]['key']

export function GymView() {
  const { workouts, isLoading, fetchWorkouts, addWorkout, deleteWorkout } = useWorkoutsStore()
  const { logs: bodyLogs, fetchLogs, addLog } = useBodyTrackerStore()
  const [tab, setTab] = useState<Tab>('workouts')
  const [showAdd, setShowAdd] = useState(false)
  const [showMeasure, setShowMeasure] = useState(false)
  const [name, setName] = useState('')
  const [duration, setDuration] = useState(60)
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<{ name: string; sets: ExerciseSet[]; notes: string }[]>([])
  const [searchEx, setSearchEx] = useState('')
  const [showExSearch, setShowExSearch] = useState(false)
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)
  const [measurements, setMeasurements] = useState<Record<string, number | ''>>({})
  const [mWeight, setMWeight] = useState<number | ''>('')
  const [mBodyFat, setMBodyFat] = useState<number | ''>('')
  const [mNotes, setMNotes] = useState('')
  const [selectedDate, setSelectedDate] = useState(toISODate())
  const today = toISODate()

  useEffect(() => { fetchWorkouts().catch(() => toast.error('Failed to load workouts')); fetchLogs().catch(() => toast.error('Failed to load body logs')) }, [fetchWorkouts, fetchLogs])

  // ─── Computed stats ──────────────────────────
  const todayWorkouts = workouts.filter((w) => w.date === selectedDate)
  const totalVolume = todayWorkouts.reduce((s, w) => s + w.exercises.reduce((se, ex) =>
    se + ex.sets.reduce((ss, set) => ss + set.reps * set.weight, 0), 0), 0)
  const totalDuration = todayWorkouts.reduce((s, w) => s + w.duration, 0)

  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return toISODate(d)
  }), [])

  const weeklyVolume = useMemo(() => last7Days.map(date => {
    const dayWorkouts = workouts.filter(w => w.date === date)
    return dayWorkouts.reduce((s, w) => s + w.exercises.reduce((se, ex) =>
      se + ex.sets.reduce((ss, set) => ss + set.reps * set.weight, 0), 0), 0)
  }), [last7Days, workouts])

  const weeklyWorkoutCount = workouts.filter(w => last7Days.includes(w.date)).length

  // Streak
  const streak = useMemo(() => {
    let count = 0
    const d = new Date()
    for (let i = 0; i < 60; i++) {
      const date = toISODate(d)
      if (workouts.some(w => w.date === date)) { count++ } else if (i > 0) break
      d.setDate(d.getDate() - 1)
    }
    return count
  }, [workouts])

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

  // Muscle group split (this week)
  const muscleGroupSplit = useMemo(() => {
    const thisWeekWorkouts = workouts.filter(w => last7Days.includes(w.date))
    const counts: Record<string, number> = {}
    Object.keys(MUSCLE_GROUPS).forEach(g => counts[g] = 0)
    thisWeekWorkouts.forEach(w => {
      w.exercises.forEach(ex => {
        Object.entries(MUSCLE_GROUPS).forEach(([group, exercises]) => {
          if (exercises.some(e => ex.name.toLowerCase().includes(e.toLowerCase()))) {
            counts[group] += ex.sets.length
          }
        })
      })
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [workouts, last7Days])

  // Volume progression (last 4 weeks)
  const weeklyProgression = useMemo(() => {
    const weeks: { label: string; volume: number }[] = []
    for (let w = 0; w < 4; w++) {
      const end = new Date(); end.setDate(end.getDate() - w * 7)
      const start = new Date(end); start.setDate(start.getDate() - 6)
      const startStr = toISODate(start); const endStr = toISODate(end)
      const vol = workouts
        .filter(wo => wo.date >= startStr && wo.date <= endStr)
        .reduce((s, wo) => s + wo.exercises.reduce((se, ex) =>
          se + ex.sets.reduce((ss, set) => ss + set.reps * set.weight, 0), 0), 0)
      weeks.push({ label: w === 0 ? 'This wk' : w === 1 ? 'Last wk' : `${w}w ago`, volume: vol })
    }
    return weeks.reverse()
  }, [workouts])

  // Measurement progress
  const measurementProgress = useMemo(() => {
    const withM = bodyLogs.filter(l => l.measurements && Object.values(l.measurements).some(v => v))
    if (withM.length < 1) return null
    return { latest: withM[0], previous: withM.length >= 2 ? withM[1] : null }
  }, [bodyLogs])

  // Helpers
  const filteredExercises = EXERCISES.filter(e => e.toLowerCase().includes(searchEx.toLowerCase()))

  const addExercise = (exName: string) => {
    setExercises([...exercises, { name: exName, sets: [{ reps: 10, weight: 0, unit: 'kg' }], notes: '' }])
    setSearchEx(''); setShowExSearch(false)
  }
  const updateSet = (exIdx: number, setIdx: number, field: 'reps' | 'weight', value: number) => {
    const u = [...exercises]; u[exIdx].sets[setIdx] = { ...u[exIdx].sets[setIdx], [field]: value }; setExercises(u)
  }
  const addSet = (exIdx: number) => {
    const u = [...exercises]; u[exIdx].sets.push({ ...u[exIdx].sets[u[exIdx].sets.length - 1] }); setExercises(u)
  }
  const removeSet = (exIdx: number, setIdx: number) => {
    const u = [...exercises]; u[exIdx].sets.splice(setIdx, 1)
    if (u[exIdx].sets.length === 0) u.splice(exIdx, 1); setExercises(u)
  }
  const removeExercise = (exIdx: number) => setExercises(exercises.filter((_, i) => i !== exIdx))

  const handleSaveWorkout = async () => {
    if (!name.trim() || exercises.length === 0) return
    await addWorkout({ date: selectedDate, name, exercises, duration, notes }).catch(() => toast.error('Failed to save workout'))
    setName(''); setDuration(60); setNotes(''); setExercises([]); setShowAdd(false)
  }

  const handleSaveMeasurements = async () => {
    const m: Record<string, number | undefined> = {}
    MEASUREMENT_FIELDS.forEach(f => { const v = measurements[f.key]; m[f.key] = v ? +v : undefined })
    await addLog({ date: selectedDate, weight: mWeight || undefined, bodyFat: mBodyFat || undefined, measurements: m as BodyLogData['measurements'], notes: mNotes }).catch(() => toast.error('Failed to save measurements'))
    setMeasurements({}); setMWeight(''); setMBodyFat(''); setMNotes(''); setShowMeasure(false)
  }

  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  const ChangeIndicator = ({ current, previous }: { current?: number; previous?: number }) => {
    if (!current || !previous) return null
    const diff = +(current - previous).toFixed(1)
    if (diff === 0) return <span className="text-text-muted text-xs flex items-center justify-center gap-0.5 mt-0.5"><Minus className="w-3 h-3" /> same</span>
    return diff > 0
      ? <span className="text-green-soft text-xs flex items-center justify-center gap-0.5 mt-0.5"><ArrowUpRight className="w-3 h-3" /> +{diff}cm</span>
      : <span className="text-red-soft text-xs flex items-center justify-center gap-0.5 mt-0.5"><ArrowDownRight className="w-3 h-3" /> {diff}cm</span>
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-accent" /> Gym
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <DateNavigator value={selectedDate} onChange={setSelectedDate} />
            <span className="text-text-muted text-sm">
              {todayWorkouts.length} workout{todayWorkouts.length !== 1 ? 's' : ''}
              {streak > 1 && <span className="ml-2 text-accent">{streak} day streak</span>}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'measurements' ? (
            <button onClick={() => setShowMeasure(true)} className="btn flex items-center gap-2"><Ruler className="w-4 h-4" /> Measure</button>
          ) : tab === 'workouts' ? (
            <button onClick={() => setShowAdd(true)} className="btn flex items-center gap-2"><Plus className="w-4 h-4" /> Log Workout</button>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {([
          { id: 'workouts' as const, label: 'Workouts', icon: Dumbbell },
          { id: 'measurements' as const, label: 'Measurements', icon: Ruler },
          { id: 'progress' as const, label: 'Progress', icon: BarChart3 },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
              tab === t.id ? 'bg-accent/10 text-accent font-medium' : 'text-text-muted hover:text-text-secondary'
            }`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ WORKOUTS TAB ═══════════════ */}
      {tab === 'workouts' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { icon: Dumbbell, value: todayWorkouts.length, label: "Today's workouts", color: 'text-green-soft' },
              { icon: TrendingUp, value: totalVolume.toLocaleString(), label: 'Volume (kg)', color: 'text-blue-soft' },
              { icon: Clock, value: totalDuration, label: 'Minutes', color: 'text-purple-soft' },
              { icon: Flame, value: streak, label: 'Day streak', color: 'text-accent' },
            ].map((s, i) => (
              <div key={i} className="card">
                <s.icon className={`w-4 h-4 ${s.color} mb-1`} />
                <p className="text-xl font-bold text-text-primary">{s.value}</p>
                <p className="text-xs text-text-muted">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Weekly Volume Chart — Recharts */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-text-muted">Weekly Volume</span>
              <span className="text-xs text-text-muted">{weeklyWorkoutCount} workouts</span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={weeklyVolume.map((vol, i) => ({
                day: dayNames[new Date(last7Days[i] + 'T12:00:00').getDay()],
                volume: Math.round(vol),
                isToday: last7Days[i] === today,
              }))} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'rgba(15,15,15,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                  formatter={(value) => [`${(Number(value) / 1000).toFixed(1)}k kg`, 'Volume']}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="volume" radius={[6, 6, 0, 0]} animationDuration={800}>
                  {weeklyVolume.map((_, i) => (
                    <Cell key={i} fill={last7Days[i] === today ? '#60a5fa' : 'rgba(96,165,250,0.3)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Muscle Group Split */}
          {muscleGroupSplit.some(([, c]) => c > 0) && (
            <div className="card mb-6">
              <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-accent" /> This Week&apos;s Muscle Split
              </h3>
              <div className="space-y-2">
                {muscleGroupSplit.filter(([, c]) => c > 0).map(([group, count]) => {
                  const maxSets = Math.max(1, ...muscleGroupSplit.map(([, c]) => c))
                  return (
                    <div key={group} className="flex items-center gap-3">
                      <span className="text-xs text-text-secondary w-20">{group}</span>
                      <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full bg-accent/60"
                          initial={{ width: 0 }} animate={{ width: `${(count / maxSets) * 100}%` }}
                          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
                      </div>
                      <span className="text-xs text-text-muted w-12 text-right">{count} sets</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Add Workout Form */}
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
                      <label className="text-xs text-text-secondary uppercase block mb-1">Duration (min)</label>
                      <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="input" />
                    </div>
                    <div className="relative">
                      <label className="text-xs text-text-secondary uppercase block mb-1">Add Exercise</label>
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

                  {exercises.map((ex, exIdx) => {
                    const pr = personalRecords.find(([n]) => n === ex.name)
                    return (
                      <div key={exIdx} className="bg-bg-elevated rounded-lg p-3 mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="text-xs font-medium">{ex.name}</h4>
                            {pr && <span className="text-xs text-accent">PR: {pr[1].weight}kg x {pr[1].reps}</span>}
                          </div>
                          <button onClick={() => removeExercise(exIdx)} className="text-text-muted hover:text-red-soft"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-xs text-text-muted uppercase mb-1">
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
                        <button onClick={() => addSet(exIdx)} className="w-full mt-1 py-1 text-xs text-text-muted hover:text-accent transition-colors border border-dashed border-border rounded-lg">+ Add Set</button>
                      </div>
                    )
                  })}

                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Workout notes..." className="input w-full h-16 resize-none mb-3" />
                  <button onClick={handleSaveWorkout} className="btn w-full" disabled={!name.trim() || exercises.length === 0}>
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
                {personalRecords.slice(0, 8).map(([exName, pr]) => (
                  <div key={exName} className="bg-bg-elevated rounded-lg p-2.5">
                    <p className="text-xs text-text-secondary truncate">{exName}</p>
                    <p className="text-lg font-bold text-accent">{pr.weight}kg</p>
                    <p className="text-xs text-text-muted">{pr.reps} reps</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workout History */}
          {isLoading ? <ListSkeleton rows={4} /> : workouts.length === 0 ? (
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
                          <span className="badge text-xs">{w.date === today ? 'Today' : formatDate(w.date)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                          <span>{w.exercises.length} exercises</span>
                          <span>{w.exercises.reduce((s, e) => s + e.sets.length, 0)} sets</span>
                          <span>{vol.toLocaleString()}kg vol</span>
                          <span>{w.duration}min</span>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
                      <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete this workout?')) deleteWorkout(w._id).catch(() => toast.error('Failed to delete')) }}
                        className="text-text-muted hover:text-red-soft transition-all md:opacity-0 md:group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    {isExpanded && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 pt-3 border-t border-border space-y-2">
                        {w.exercises.map((ex, i) => (
                          <div key={i} className="bg-bg-elevated rounded-lg p-2.5">
                            <p className="text-xs font-medium mb-1">{ex.name}</p>
                            <div className="space-y-0.5">
                              {ex.sets.map((set, si) => (
                                <div key={si} className="flex items-center gap-2 text-xs text-text-muted">
                                  <span className="w-6">#{si + 1}</span>
                                  <span>{set.weight}kg x {set.reps}</span>
                                  <span className="text-text-muted">= {set.weight * set.reps}kg</span>
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
        </>
      )}

      {/* ═══════════════ MEASUREMENTS TAB ═══════════════ */}
      {tab === 'measurements' && (
        <>
          <AnimatePresence>
            {showMeasure && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
                <div className="card border-accent/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium flex items-center gap-2"><Ruler className="w-4 h-4 text-accent" /> Log Measurements</h3>
                    <button onClick={() => setShowMeasure(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="text-xs text-text-secondary uppercase block mb-1">Weight (kg)</label>
                      <input type="number" step="0.1" value={mWeight} onChange={e => setMWeight(e.target.value ? +e.target.value : '')} className="input" />
                    </div>
                    <div>
                      <label className="text-xs text-text-secondary uppercase block mb-1">Body Fat %</label>
                      <input type="number" step="0.1" value={mBodyFat} onChange={e => setMBodyFat(e.target.value ? +e.target.value : '')} className="input" />
                    </div>
                  </div>
                  <p className="text-xs text-text-muted mb-3 flex items-center gap-1.5"><Ruler className="w-3 h-3 text-accent" /> Muscle Dimensions (cm)</p>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {MEASUREMENT_FIELDS.map(f => (
                      <div key={f.key}>
                        <label className="text-xs text-text-secondary block mb-1">{f.label}</label>
                        <input type="number" step="0.5" value={measurements[f.key] ?? ''}
                          onChange={e => setMeasurements({ ...measurements, [f.key]: e.target.value ? +e.target.value : '' })}
                          className="input text-xs" placeholder="cm" />
                      </div>
                    ))}
                  </div>
                  <input type="text" value={mNotes} onChange={e => setMNotes(e.target.value)} placeholder="Notes (optional)" className="input w-full mb-4 text-xs" />
                  <button onClick={handleSaveMeasurements} className="btn w-full">Save Measurements</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {measurementProgress ? (
            <>
              <div className="card mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-medium text-text-muted flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-accent" /> Latest Measurements
                  </h3>
                  <span className="text-xs text-text-muted">{formatDate(measurementProgress.latest.date)}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {MEASUREMENT_FIELDS.map(f => {
                    const current = measurementProgress.latest.measurements?.[f.key as MeasurementKey]
                    const previous = measurementProgress.previous?.measurements?.[f.key as MeasurementKey]
                    if (!current) return null
                    return (
                      <div key={f.key} className="bg-bg-elevated rounded-xl p-3 text-center">
                        <p className="text-lg font-bold text-text-primary">{current}<span className="text-xs text-text-muted font-normal">cm</span></p>
                        <p className="text-xs text-text-muted">{f.label}</p>
                        <ChangeIndicator current={current} previous={previous} />
                      </div>
                    )
                  })}
                </div>
              </div>

              {(measurementProgress.latest.weight || measurementProgress.latest.bodyFat) && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {measurementProgress.latest.weight && (
                    <div className="card text-center">
                      <p className="text-2xl font-bold text-accent">{measurementProgress.latest.weight}</p>
                      <p className="text-xs text-text-muted">Weight (kg)</p>
                    </div>
                  )}
                  {measurementProgress.latest.bodyFat && (
                    <div className="card text-center">
                      <p className="text-2xl font-bold text-blue-soft">{measurementProgress.latest.bodyFat}%</p>
                      <p className="text-xs text-text-muted">Body Fat</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 card mb-6">
              <Ruler className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="text-sm text-text-muted">No measurements yet</p>
              <p className="text-xs text-text-muted mt-1">Track your muscle dimensions weekly to see gains</p>
            </div>
          )}

          {/* Measurement History */}
          {bodyLogs.filter(l => l.measurements && Object.values(l.measurements).some(v => v)).length > 0 && (
            <div className="card">
              <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-accent" /> History
              </h3>
              <div className="space-y-2">
                {bodyLogs.filter(l => l.measurements && Object.values(l.measurements).some(v => v)).slice(0, 10).map(log => (
                  <div key={log._id} className="bg-bg-elevated rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-text-primary">{formatDate(log.date)}</span>
                      <div className="flex items-center gap-2">
                        {log.weight && <span className="badge text-xs">{log.weight}kg</span>}
                        {log.bodyFat && <span className="badge text-xs">{log.bodyFat}%</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {MEASUREMENT_FIELDS.map(f => {
                        const val = log.measurements?.[f.key as MeasurementKey]
                        if (!val) return null
                        return <span key={f.key} className="text-xs text-text-muted">{f.label}: <span className="text-text-secondary font-medium">{val}cm</span></span>
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════ PROGRESS TAB ═══════════════ */}
      {tab === 'progress' && (
        <>
          {/* Volume Progression — Area Chart */}
          <div className="card mb-6">
            <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-accent" /> Weekly Volume Progression
            </h3>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={weeklyProgression} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e8d5b7" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#e8d5b7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'rgba(15,15,15,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                  formatter={(value) => [`${(Number(value) / 1000).toFixed(1)}k kg`, 'Volume']}
                />
                <Area type="monotone" dataKey="volume" stroke="#e8d5b7" strokeWidth={2} fill="url(#volGrad)" animationDuration={800} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Muscle Radar Chart */}
          {muscleGroupSplit.some(([, c]) => c > 0) && (
            <div className="card mb-6">
              <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-accent" /> Muscle Balance Radar
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={muscleGroupSplit.map(([group, sets]) => ({ muscle: group, sets }))}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="muscle" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                  <Radar name="Sets" dataKey="sets" stroke="#e8d5b7" fill="#e8d5b7" fillOpacity={0.15} strokeWidth={2} animationDuration={800} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* All PRs */}
          {personalRecords.length > 0 && (
            <div className="card mb-6">
              <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-accent" /> All Personal Records
              </h3>
              <div className="space-y-2">
                {personalRecords.map(([exName, pr], i) => {
                  const maxPR = personalRecords[0][1].weight
                  return (
                    <div key={exName} className="flex items-center gap-3">
                      <span className="text-xs text-text-muted w-5">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-text-primary font-medium">{exName}</span>
                          <span className="text-xs text-accent font-bold">{pr.weight}kg x {pr.reps}</span>
                        </div>
                        <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full bg-accent/50"
                            initial={{ width: 0 }} animate={{ width: `${(pr.weight / maxPR) * 100}%` }}
                            transition={{ duration: 0.5, delay: i * 0.05 }} />
                        </div>
                      </div>
                      <span className="text-xs text-text-muted">{formatDate(pr.date)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Muscle Group Balance */}
          {muscleGroupSplit.some(([, c]) => c > 0) && (
            <div className="card mb-6">
              <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-accent" /> Muscle Group Balance (This Week)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {muscleGroupSplit.map(([group, count]) => {
                  const total = muscleGroupSplit.reduce((s, [, c]) => s + c, 0)
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0
                  return (
                    <div key={group} className="bg-bg-elevated rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-text-primary">{count}</p>
                      <p className="text-xs text-text-muted">{group}</p>
                      {pct > 0 && <p className="text-xs text-accent mt-0.5">{pct}%</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 30-Day Heatmap */}
          <div className="card">
            <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-accent" /> Last 30 Days
            </h3>
            <div className="grid grid-cols-10 gap-1.5">
              {Array.from({ length: 30 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (29 - i))
                const date = toISODate(d)
                const count = workouts.filter(w => w.date === date).length
                const isToday = date === today
                return (
                  <div key={i} className="flex flex-col items-center gap-0.5" title={`${formatDate(date)}: ${count} workout${count !== 1 ? 's' : ''}`}>
                    <div className={`w-full aspect-square rounded-md transition-colors ${
                      count >= 2 ? 'bg-accent/80' : count === 1 ? 'bg-accent/35' : 'bg-bg-elevated'
                    } ${isToday ? 'ring-1 ring-accent/50' : ''}`} />
                    {(i % 5 === 0 || isToday) && <span className="text-[9px] text-text-muted">{d.getDate()}</span>}
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-3 mt-3 justify-end">
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-bg-elevated" /><span className="text-[10px] text-text-muted">Rest</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-accent/35" /><span className="text-[10px] text-text-muted">1</span></div>
              <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-accent/80" /><span className="text-[10px] text-text-muted">2+</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
