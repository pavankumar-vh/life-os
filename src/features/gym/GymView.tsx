'use client'

import { useEffect, useState } from 'react'
import { useWorkoutsStore, type Exercise, type ExerciseSet } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Dumbbell, Plus, Trash2, X, Trophy, TrendingUp, Clock } from 'lucide-react'

const COMMON_EXERCISES = [
  'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Barbell Row',
  'Pull-ups', 'Lat Pulldown', 'Leg Press', 'Romanian Deadlift', 'Bicep Curl',
  'Tricep Pushdown', 'Lateral Raise', 'Face Pull', 'Cable Fly', 'Leg Curl',
  'Leg Extension', 'Calf Raise', 'Plank', 'Dips', 'Incline Bench',
]

export function GymView() {
  const { workouts, isLoading, fetchWorkouts, addWorkout, deleteWorkout } = useWorkoutsStore()
  const [showAdd, setShowAdd] = useState(false)
  const [workoutName, setWorkoutName] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [duration, setDuration] = useState(0)
  const [notes, setNotes] = useState('')
  const [searchExercise, setSearchExercise] = useState('')
  const today = toISODate()

  useEffect(() => { fetchWorkouts().catch(() => {}) }, [fetchWorkouts])

  const addExercise = (name: string) => {
    setExercises([...exercises, { name, sets: [{ reps: 10, weight: 0, unit: 'kg' }], notes: '' }])
    setSearchExercise('')
  }

  const addSet = (exIdx: number) => {
    const updated = [...exercises]
    const lastSet = updated[exIdx].sets[updated[exIdx].sets.length - 1]
    updated[exIdx].sets.push({ ...lastSet }) // Clone last set for convenience
    setExercises(updated)
  }

  const updateSet = (exIdx: number, setIdx: number, field: keyof ExerciseSet, value: number | string) => {
    const updated = [...exercises]
    updated[exIdx].sets[setIdx] = { ...updated[exIdx].sets[setIdx], [field]: value }
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
    if (!workoutName.trim() || exercises.length === 0) return
    await addWorkout({ date: today, name: workoutName, exercises, duration, notes })
    setWorkoutName('')
    setExercises([])
    setDuration(0)
    setNotes('')
    setShowAdd(false)
  }

  // Get personal records
  const getAllExercisePRs = () => {
    const prs: Record<string, { weight: number; date: string }> = {}
    workouts.forEach((w) => {
      w.exercises.forEach((ex) => {
        ex.sets.forEach((s) => {
          if (!prs[ex.name] || s.weight > prs[ex.name].weight) {
            prs[ex.name] = { weight: s.weight, date: w.date }
          }
        })
      })
    })
    return prs
  }

  const prs = getAllExercisePRs()

  // Get suggested weight for an exercise
  const getSuggestedWeight = (name: string): number | null => {
    for (const w of workouts) {
      for (const ex of w.exercises) {
        if (ex.name === name && ex.sets.length > 0) {
          return ex.sets[ex.sets.length - 1].weight
        }
      }
    }
    return null
  }

  const filteredExercises = searchExercise
    ? COMMON_EXERCISES.filter((e) => e.toLowerCase().includes(searchExercise.toLowerCase()))
    : []

  const todayWorkouts = workouts.filter((w) => w.date === today)
  const totalVolume = todayWorkouts.reduce((sum, w) =>
    sum + w.exercises.reduce((s, ex) =>
      s + ex.sets.reduce((ss, set) => ss + set.weight * set.reps, 0), 0), 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-brutal-yellow" />
            Gym
          </h1>
          <p className="text-text-muted font-mono text-sm mt-1">
            {workouts.length} workouts logged
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="brutal-btn flex items-center gap-2">
          <Plus className="w-4 h-4" /> Log Workout
        </button>
      </div>

      {/* Today Stats */}
      {todayWorkouts.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="border-3 border-brutal-green bg-bg-surface p-3 shadow-brutal-green">
            <Dumbbell className="w-4 h-4 text-brutal-green mb-1" />
            <p className="font-display text-xl font-bold">{todayWorkouts.length}</p>
            <p className="font-mono text-[10px] text-text-muted uppercase">Workouts</p>
          </div>
          <div className="border-3 border-brutal-blue bg-bg-surface p-3 shadow-brutal-blue">
            <TrendingUp className="w-4 h-4 text-brutal-blue mb-1" />
            <p className="font-display text-xl font-bold">{totalVolume.toLocaleString()}</p>
            <p className="font-mono text-[10px] text-text-muted uppercase">Total Vol (kg)</p>
          </div>
          <div className="border-3 border-brutal-purple bg-bg-surface p-3 shadow-brutal-purple">
            <Clock className="w-4 h-4 text-brutal-purple mb-1" />
            <p className="font-display text-xl font-bold">{todayWorkouts.reduce((s, w) => s + w.duration, 0)}</p>
            <p className="font-mono text-[10px] text-text-muted uppercase">Minutes</p>
          </div>
        </div>
      )}

      {/* Add Workout */}
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
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider">Log Workout</h3>
                <button onClick={() => setShowAdd(false)}>
                  <X className="w-4 h-4 text-text-muted hover:text-text-primary" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <input
                  type="text"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                  placeholder="Workout name (e.g. Push Day)"
                  className="brutal-input col-span-2"
                />
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-text-muted" />
                  <input
                    type="number"
                    value={duration || ''}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    placeholder="Duration (min)"
                    className="brutal-input flex-1"
                  />
                </div>
              </div>

              {/* Exercise Search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchExercise}
                  onChange={(e) => setSearchExercise(e.target.value)}
                  placeholder="Search exercise to add..."
                  className="brutal-input w-full"
                />
                {filteredExercises.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-bg-elevated border-3 border-border-strong mt-1 z-10 max-h-40 overflow-y-auto">
                    {filteredExercises.map((ex) => {
                      const suggested = getSuggestedWeight(ex)
                      return (
                        <button
                          key={ex}
                          onClick={() => addExercise(ex)}
                          className="w-full text-left px-3 py-2 font-mono text-sm hover:bg-brutal-yellow hover:text-black transition-colors flex items-center justify-between"
                        >
                          <span>{ex}</span>
                          {suggested !== null && (
                            <span className="text-[10px] text-text-muted">Last: {suggested}kg</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
                {searchExercise && filteredExercises.length === 0 && (
                  <button
                    onClick={() => addExercise(searchExercise)}
                    className="absolute top-full left-0 right-0 bg-bg-elevated border-3 border-brutal-yellow p-2 mt-1 font-mono text-sm text-brutal-yellow hover:bg-brutal-yellow hover:text-black transition-colors"
                  >
                    + Add &quot;{searchExercise}&quot; as custom exercise
                  </button>
                )}
              </div>

              {/* Exercises */}
              {exercises.map((ex, exIdx) => (
                <div key={exIdx} className="border-2 border-border bg-bg-elevated p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-mono text-xs font-bold uppercase tracking-wider">{ex.name}</h4>
                    {prs[ex.name] && (
                      <span className="flex items-center gap-1 text-brutal-yellow font-mono text-[10px]">
                        <Trophy className="w-3 h-3" /> PR: {prs[ex.name].weight}kg
                      </span>
                    )}
                    <button onClick={() => removeExercise(exIdx)}>
                      <X className="w-3.5 h-3.5 text-text-muted hover:text-brutal-red" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-[10px] font-mono text-text-muted uppercase">
                      <span className="w-8">Set</span>
                      <span>Weight</span>
                      <span>Reps</span>
                      <span className="w-6" />
                    </div>
                    {ex.sets.map((set, setIdx) => (
                      <div key={setIdx} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
                        <span className="w-8 font-mono text-xs text-text-muted">{setIdx + 1}</span>
                        <input
                          type="number"
                          value={set.weight || ''}
                          onChange={(e) => updateSet(exIdx, setIdx, 'weight', Number(e.target.value))}
                          className="brutal-input text-xs py-1"
                          placeholder="kg"
                        />
                        <input
                          type="number"
                          value={set.reps || ''}
                          onChange={(e) => updateSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                          className="brutal-input text-xs py-1"
                          placeholder="reps"
                        />
                        <button onClick={() => removeSet(exIdx, setIdx)}>
                          <Trash2 className="w-3 h-3 text-text-muted hover:text-brutal-red" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addSet(exIdx)}
                    className="w-full mt-2 py-1 border-2 border-dashed border-border text-text-muted font-mono text-xs hover:border-brutal-yellow hover:text-brutal-yellow transition-colors"
                  >
                    + Add Set
                  </button>
                </div>
              ))}

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Workout notes..."
                className="brutal-input w-full h-16 resize-none mb-3"
              />

              <button onClick={handleSave} className="brutal-btn w-full">
                Save Workout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Personal Records */}
      {Object.keys(prs).length > 0 && (
        <div className="border-3 border-brutal-yellow bg-bg-surface p-4 mb-6 shadow-brutal">
          <h3 className="font-mono text-xs uppercase tracking-widest text-text-muted mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-brutal-yellow" /> Personal Records
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(prs).slice(0, 8).map(([name, pr]) => (
              <div key={name} className="border-2 border-border p-2">
                <p className="font-mono text-xs truncate">{name}</p>
                <p className="font-display text-lg font-bold text-brutal-yellow">{pr.weight}kg</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workout History */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="font-mono text-sm text-text-muted animate-pulse">Loading workouts...</p>
        </div>
      ) : workouts.length === 0 && !showAdd ? (
        <div className="text-center py-16 border-3 border-dashed border-border">
          <Dumbbell className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="font-mono text-sm text-text-muted">No workouts yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {workouts.map((w) => (
            <div key={w._id} className="border-3 border-border bg-bg-surface p-4 group hover:border-border-strong transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-mono text-sm font-bold">{w.name}</h3>
                  <p className="font-mono text-[10px] text-text-muted uppercase">
                    {formatDate(w.date)} · {w.exercises.length} exercises · {w.duration}min
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-text-muted">
                    {w.exercises.reduce((s, ex) => s + ex.sets.reduce((ss, set) => ss + set.weight * set.reps, 0), 0).toLocaleString()} vol
                  </span>
                  <button
                    onClick={() => deleteWorkout(w._id)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-brutal-red transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
