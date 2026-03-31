'use client'

import { useEffect, useState, useMemo } from 'react'
import { useGoalsStore, type GoalData } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { ListSkeleton } from '@/components/Skeletons'
import { Plus, Trash2, X, Target, TrendingUp, Pause, Play, CheckCircle2, Edit3 } from 'lucide-react'
import { toast } from '@/components/Toast'

const CATEGORIES = ['Health', 'Fitness', 'Career', 'Finance', 'Learning', 'Personal', 'Other']

export function GoalsView() {
  const { goals, isLoading, fetchGoals, addGoal, updateGoal, deleteGoal } = useGoalsStore()
  const [showAdd, setShowAdd] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [incrementValue, setIncrementValue] = useState<Record<string, number>>({})

  // Form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Personal')
  const [target, setTarget] = useState(100)
  const [unit, setUnit] = useState('')
  const [deadline, setDeadline] = useState('')

  useEffect(() => { fetchGoals().catch(() => toast.error('Failed to load goals')) }, [fetchGoals])

  const stats = useMemo(() => ({
    active: goals.filter(g => g.status === 'active').length,
    completed: goals.filter(g => g.status === 'completed').length,
    paused: goals.filter(g => g.status === 'paused').length,
    avgProgress: goals.filter(g => g.status === 'active').length > 0
      ? Math.round(goals.filter(g => g.status === 'active').reduce((s, g) => s + (g.progress / g.target) * 100, 0) / goals.filter(g => g.status === 'active').length)
      : 0,
    categories: [...new Set(goals.map(g => g.category))],
  }), [goals])

  const filtered = useMemo(() => {
    return goals
      .filter(g => statusFilter === 'all' || g.status === statusFilter)
      .filter(g => categoryFilter === 'all' || g.category === categoryFilter)
      .sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1
        if (b.status === 'active' && a.status !== 'active') return 1
        return (b.progress / b.target) - (a.progress / a.target)
      })
  }, [goals, statusFilter, categoryFilter])

  const handleAdd = async () => {
    if (!title.trim()) return
    await addGoal({ title, description, category, progress: 0, target, unit, deadline: deadline || null, status: 'active' }).catch(() => toast.error('Failed to add goal'))
    setTitle(''); setDescription(''); setCategory('Personal'); setTarget(100); setUnit(''); setDeadline('')
    setShowAdd(false)
  }

  const handleIncrement = async (goal: GoalData) => {
    const inc = incrementValue[goal._id] || 1
    const newProgress = Math.min(goal.target, goal.progress + inc)
    const updates: Partial<GoalData> = { progress: newProgress }
    if (newProgress >= goal.target) updates.status = 'completed'
    await updateGoal(goal._id, updates).catch(() => toast.error('Failed to update goal'))
    setIncrementValue(prev => ({ ...prev, [goal._id]: 1 }))
  }

  const togglePause = async (goal: GoalData) => {
    await updateGoal(goal._id, { status: goal.status === 'paused' ? 'active' : 'paused' }).catch(() => toast.error('Failed to update goal'))
  }

  const daysUntilDeadline = (deadline: string) => {
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return `${Math.abs(diff)}d overdue`
    if (diff === 0) return 'Due today'
    return `${diff}d left`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-accent" /> Goals
          </h1>
          <p className="text-text-muted text-xs mt-0.5">{stats.active} active · {stats.avgProgress}% avg progress</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn flex items-center gap-2"><Plus className="w-4 h-4" /> New Goal</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active', value: stats.active, color: 'text-accent' },
          { label: 'Completed', value: stats.completed, color: 'text-green-soft' },
          { label: 'Paused', value: stats.paused, color: 'text-text-muted' },
          { label: 'Avg Progress', value: `${stats.avgProgress}%`, color: 'text-accent' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex gap-1 bg-bg-elevated rounded-lg p-1">
          {['all', 'active', 'completed', 'paused'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all capitalize ${
                statusFilter === s ? 'bg-bg-surface text-accent font-medium shadow-sm' : 'text-text-muted hover:text-text-primary'
              }`}>{s}</button>
          ))}
        </div>
        {stats.categories.length > 1 && (
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="input text-xs">
            <option value="all">All Categories</option>
            {stats.categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="card border-accent/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">New Goal</h3>
                <button onClick={() => setShowAdd(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
              </div>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Goal title (e.g. Read 24 books)" className="input w-full mb-3" autoFocus />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why is this important? (optional)" className="input w-full mb-3 min-h-[60px] text-xs" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="text-xs text-text-secondary uppercase block mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="input text-xs w-full">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary uppercase block mb-1">Target</label>
                  <input type="number" value={target || ''} onChange={(e) => setTarget(Number(e.target.value))} className="input text-xs w-full" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary uppercase block mb-1">Unit</label>
                  <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="books, km, etc." className="input text-xs w-full" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary uppercase block mb-1">Deadline</label>
                  <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input text-xs w-full" />
                </div>
              </div>
              <button onClick={handleAdd} className="btn w-full">Create Goal</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals List */}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 card"><p className="text-sm text-text-muted">No goals yet. Set your first goal!</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(goal => {
            const pct = goal.target > 0 ? Math.round((goal.progress / goal.target) * 100) : 0
            const isComplete = goal.status === 'completed'
            const isPaused = goal.status === 'paused'
            return (
              <motion.div key={goal._id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`card group ${isPaused ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isComplete ? <CheckCircle2 className="w-4 h-4 text-green-soft shrink-0" /> :
                        isPaused ? <Pause className="w-4 h-4 text-text-muted shrink-0" /> :
                        <TrendingUp className="w-4 h-4 text-accent shrink-0" />}
                      <h3 className={`text-sm font-medium ${isComplete ? 'line-through text-text-muted' : 'text-text-primary'}`}>{goal.title}</h3>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-text-muted">{goal.category}</span>
                    </div>
                    {goal.description && <p className="text-[11px] text-text-muted mt-1 ml-6 line-clamp-1">{goal.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0 ml-2">
                    {!isComplete && (
                      <button onClick={() => togglePause(goal)} className="text-text-muted hover:text-accent" title={isPaused ? 'Resume' : 'Pause'}>
                        {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button onClick={() => { if (confirm('Delete this goal?')) deleteGoal(goal._id).catch(() => toast.error('Failed to delete')) }} className="text-text-muted hover:text-red-soft"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
                    <motion.div className={`h-full rounded-full ${isComplete ? 'bg-green-soft' : 'bg-accent'}`}
                      initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }} transition={{ duration: 0.5 }} />
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${isComplete ? 'text-green-soft' : 'text-accent'}`}>{pct}%</span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span>{goal.progress} / {goal.target} {goal.unit}</span>
                    {goal.deadline && (
                      <span className={new Date(goal.deadline) < new Date() && !isComplete ? 'text-red-soft font-medium' : ''}>
                        {daysUntilDeadline(goal.deadline)}
                      </span>
                    )}
                  </div>
                  {!isComplete && !isPaused && (
                    <div className="flex items-center gap-1.5">
                      <input type="number" value={incrementValue[goal._id] || 1} min={1}
                        onChange={(e) => setIncrementValue(prev => ({ ...prev, [goal._id]: Math.max(1, Number(e.target.value)) }))}
                        className="input w-12 text-xs text-center py-0.5" />
                      <button onClick={() => handleIncrement(goal)} className="btn text-xs py-1 px-3">+ Add</button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
