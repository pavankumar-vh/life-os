'use client'

import { useEffect, useState } from 'react'
import { useGoalsStore, type GoalData } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Plus, Trash2, X, Pause, Play, CheckCircle2 } from 'lucide-react'

const CATEGORIES = ['health', 'fitness', 'career', 'finance', 'learning', 'personal', 'general']

export function GoalsView() {
  const { goals, isLoading, fetchGoals, addGoal, updateGoal, deleteGoal } = useGoalsStore()
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('general')
  const [target, setTarget] = useState(100)
  const [unit, setUnit] = useState('%')
  const [deadline, setDeadline] = useState('')

  useEffect(() => { fetchGoals().catch(() => {}) }, [fetchGoals])

  const handleAdd = async () => {
    if (!title.trim()) return
    await addGoal({ title, description, category, target, unit, deadline: deadline || null })
    setTitle(''); setDescription(''); setCategory('general'); setTarget(100); setUnit('%'); setDeadline('')
    setShowAdd(false)
  }

  const handleProgress = async (goal: GoalData, delta: number) => {
    const newProgress = Math.max(0, Math.min(goal.target, goal.progress + delta))
    const status = newProgress >= goal.target ? 'completed' : goal.status
    await updateGoal(goal._id, { progress: newProgress, status })
  }

  const togglePause = async (goal: GoalData) => {
    await updateGoal(goal._id, {
      status: goal.status === 'paused' ? 'active' : 'paused'
    })
  }

  const activeGoals = goals.filter((g) => g.status === 'active')
  const completedGoals = goals.filter((g) => g.status === 'completed')
  const pausedGoals = goals.filter((g) => g.status === 'paused')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-brutal-yellow" />
            Goals
          </h1>
          <p className="text-text-muted font-mono text-sm mt-1">
            {activeGoals.length} active · {completedGoals.length} completed
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="brutal-btn flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Goal
        </button>
      </div>

      {/* Add Goal */}
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
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider">New Goal</h3>
                <button onClick={() => setShowAdd(false)}>
                  <X className="w-4 h-4 text-text-muted hover:text-text-primary" />
                </button>
              </div>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Goal title..."
                className="brutal-input w-full mb-3"
                autoFocus
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description..."
                className="brutal-input w-full h-16 resize-none mb-3"
              />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="brutal-input w-full text-xs">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1">Target</label>
                  <input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} className="brutal-input w-full text-xs" />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1">Unit</label>
                  <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} className="brutal-input w-full text-xs" placeholder="%, kg, books..." />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1">Deadline</label>
                  <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="brutal-input w-full text-xs" />
                </div>
              </div>

              <button onClick={handleAdd} className="brutal-btn w-full">Create Goal</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="font-mono text-sm text-text-muted animate-pulse">Loading goals...</p>
        </div>
      ) : goals.length === 0 && !showAdd ? (
        <div className="text-center py-16 border-3 border-dashed border-border">
          <Target className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="font-mono text-sm text-text-muted">No goals yet</p>
          <p className="font-mono text-xs text-text-muted mt-1">Set your first goal</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Goals */}
          {activeGoals.length > 0 && (
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-text-muted mb-3">Active</h3>
              <div className="space-y-3">
                {activeGoals.map((goal) => {
                  const pct = Math.round((goal.progress / goal.target) * 100)
                  return (
                    <motion.div
                      key={goal._id}
                      layout
                      className="border-3 border-border bg-bg-surface p-4 hover:border-border-strong transition-all group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-mono text-sm font-bold">{goal.title}</h3>
                          {goal.description && (
                            <p className="font-mono text-[10px] text-text-muted mt-0.5">{goal.description}</p>
                          )}
                          <div className="flex gap-2 mt-1">
                            <span className="brutal-badge text-[8px] text-brutal-cyan">{goal.category}</span>
                            {goal.deadline && (
                              <span className="font-mono text-[10px] text-text-muted">Due: {goal.deadline}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => togglePause(goal)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-brutal-yellow transition-all p-1">
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteGoal(goal._id)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-brutal-red transition-all p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-4 bg-bg-elevated border-2 border-border-strong">
                          <motion.div
                            className="h-full bg-brutal-yellow"
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, pct)}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold w-16 text-right">
                          {goal.progress}/{goal.target} {goal.unit}
                        </span>
                        <span className="font-mono text-xs text-brutal-yellow font-bold">{pct}%</span>
                      </div>

                      {/* Quick Progress Buttons */}
                      <div className="flex gap-2 mt-3">
                        {[1, 5, 10].map((delta) => (
                          <button
                            key={delta}
                            onClick={() => handleProgress(goal, delta)}
                            className="brutal-btn-ghost text-[10px] px-2 py-1"
                          >
                            +{delta}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Paused Goals */}
          {pausedGoals.length > 0 && (
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-text-muted mb-3">Paused</h3>
              <div className="space-y-2">
                {pausedGoals.map((goal) => (
                  <div key={goal._id} className="border-3 border-border bg-bg-surface p-3 opacity-50 flex items-center gap-3 group">
                    <button onClick={() => togglePause(goal)} className="text-text-muted hover:text-brutal-green">
                      <Play className="w-4 h-4" />
                    </button>
                    <span className="font-mono text-sm flex-1">{goal.title}</span>
                    <button onClick={() => deleteGoal(goal._id)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-brutal-red">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-text-muted mb-3">Completed 🎯</h3>
              <div className="space-y-2">
                {completedGoals.map((goal) => (
                  <div key={goal._id} className="border-3 border-brutal-green/30 bg-bg-surface p-3 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-brutal-green" />
                    <span className="font-mono text-sm text-text-muted line-through flex-1">{goal.title}</span>
                    <span className="brutal-badge text-[8px] text-brutal-green">Done</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
