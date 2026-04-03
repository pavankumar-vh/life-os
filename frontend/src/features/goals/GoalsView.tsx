'use client'

import { useEffect, useState, useMemo } from 'react'
import { useGoalsStore, type GoalData } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { ListSkeleton } from '@/components/Skeletons'
import { Plus, Trash2, X, Target, TrendingUp, Pause, Play, CheckCircle2, Edit3, Flag, Clock, Trophy, BarChart3 } from 'lucide-react'
import { toast } from '@/components/Toast'

const CATEGORIES = ['Health', 'Fitness', 'Career', 'Finance', 'Learning', 'Personal', 'Other']

const CATEGORY_COLORS: Record<string, string> = {
  Health: '#34D399', Fitness: '#60A5FA', Career: '#FBBF24', Finance: '#A78BFA',
  Learning: '#FB923C', Personal: '#F472B6', Other: '#94A3B8',
}

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
    if (!title.trim()) { toast.error('Please enter a goal title'); return }
    if (target <= 0) { toast.error('Target must be greater than 0'); return }
    try {
      await addGoal({ title, description, category, progress: 0, target, unit, deadline: deadline || null, status: 'active' })
      toast.success('Goal created!')
      setTitle(''); setDescription(''); setCategory('Personal'); setTarget(100); setUnit(''); setDeadline('')
      setShowAdd(false)
    } catch {
      toast.error('Failed to add goal')
    }
  }

  const handleIncrement = async (goal: GoalData) => {
    const inc = incrementValue[goal._id] || 1
    const newProgress = Math.min(goal.target, goal.progress + inc)
    const updates: Partial<GoalData> = { progress: newProgress }
    if (newProgress >= goal.target) {
      updates.status = 'completed'
    }
    try {
      await updateGoal(goal._id, updates)
      if (newProgress >= goal.target) {
        toast.success(`🎉 "${goal.title}" completed!`)
      } else {
        toast.success(`+${inc} added — ${newProgress}/${goal.target} ${goal.unit}`)
      }
      setIncrementValue(prev => ({ ...prev, [goal._id]: 1 }))
    } catch {
      toast.error('Failed to update progress')
    }
  }

  const togglePause = async (goal: GoalData) => {
    const newStatus = goal.status === 'paused' ? 'active' : 'paused'
    try {
      await updateGoal(goal._id, { status: newStatus })
      toast.success(newStatus === 'paused' ? 'Goal paused' : 'Goal resumed')
    } catch {
      toast.error('Failed to update goal')
    }
  }

  const handleDelete = async (goal: GoalData) => {
    try {
      await deleteGoal(goal._id)
      toast.success('Goal deleted')
    } catch {
      toast.error('Failed to delete goal')
    }
  }

  const daysUntilDeadline = (deadline: string) => {
    const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return `${Math.abs(diff)}d overdue`
    if (diff === 0) return 'Due today'
    return `${diff}d left`
  }

  return (
    <div className="pb-8">
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
          { label: 'Active', value: stats.active, color: 'text-accent', icon: Flag },
          { label: 'Completed', value: stats.completed, color: 'text-green-soft', icon: Trophy },
          { label: 'Paused', value: stats.paused, color: 'text-text-muted', icon: Pause },
          { label: 'Avg Progress', value: `${stats.avgProgress}%`, color: 'text-accent', icon: BarChart3 },
        ].map(s => (
          <div key={s.label} className="bg-bg-elevated border border-border rounded-xl p-4 text-center">
            <s.icon className={`w-4 h-4 mx-auto mb-1.5 ${s.color}`} />
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex gap-1 bg-bg-elevated border border-border rounded-lg p-1">
          {['all', 'active', 'completed', 'paused'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs rounded-md transition-all capitalize ${
                statusFilter === s ? 'bg-accent/20 text-accent font-medium ring-1 ring-accent/30' : 'text-text-muted hover:text-text-primary'
              }`}>{s}</button>
          ))}
        </div>
        {stats.categories.length > 1 && (
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-bg-elevated border border-border rounded-lg px-3 py-1.5 text-xs text-text-primary outline-none">
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
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Target size={14} className="text-accent" /> New Goal
                </h3>
                <button onClick={() => setShowAdd(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
              </div>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Goal title (e.g. Read 24 books)" className="input w-full mb-3" autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why is this important? (optional)" className="input w-full mb-3 min-h-[60px] text-xs" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="text-[10px] text-text-secondary uppercase block mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="input text-xs w-full">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary uppercase block mb-1">Target</label>
                  <input type="number" value={target || ''} onChange={(e) => setTarget(Number(e.target.value))} className="input text-xs w-full" />
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary uppercase block mb-1">Unit</label>
                  <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="books, km, etc." className="input text-xs w-full" />
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary uppercase block mb-1">Deadline</label>
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
        <div className="text-center py-16 card">
          <Target className="w-10 h-10 text-text-muted/30 mx-auto mb-3" />
          <p className="text-sm text-text-muted mb-1">No goals yet</p>
          <p className="text-xs text-text-muted">Set your first goal and start tracking progress</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(goal => {
            const pct = goal.target > 0 ? Math.round((goal.progress / goal.target) * 100) : 0
            const isComplete = goal.status === 'completed'
            const isPaused = goal.status === 'paused'
            const catColor = CATEGORY_COLORS[goal.category] || '#94A3B8'
            return (
              <motion.div key={goal._id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`card group ${isPaused ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isComplete ? <CheckCircle2 className="w-4 h-4 text-green-soft shrink-0" /> :
                        isPaused ? <Pause className="w-4 h-4 text-text-muted shrink-0" /> :
                        <TrendingUp className="w-4 h-4 text-accent shrink-0" />}
                      <h3 className={`text-sm font-medium ${isComplete ? 'line-through text-text-muted' : 'text-text-primary'}`}>{goal.title}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-border font-medium"
                        style={{ color: catColor, backgroundColor: `${catColor}15` }}>
                        {goal.category}
                      </span>
                    </div>
                    {goal.description && <p className="text-[11px] text-text-muted mt-1 ml-6 line-clamp-1">{goal.description}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {!isComplete && (
                      <button onClick={() => togglePause(goal)} className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-colors" title={isPaused ? 'Resume' : 'Pause'}>
                        {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    <button onClick={() => handleDelete(goal)}
                      className="p-1.5 rounded-md text-text-muted hover:text-red-soft hover:bg-red-soft/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-2 bg-bg-elevated border border-border rounded-full overflow-hidden">
                    <motion.div className={`h-full rounded-full ${isComplete ? 'bg-green-soft' : ''}`}
                      style={!isComplete ? { backgroundColor: catColor } : undefined}
                      initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }} transition={{ duration: 0.5 }} />
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${isComplete ? 'text-green-soft' : 'text-text-primary'}`}>{pct}%</span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="font-medium">{goal.progress}<span className="text-text-muted font-normal"> / {goal.target} {goal.unit}</span></span>
                    {goal.deadline && (
                      <span className={`flex items-center gap-1 ${new Date(goal.deadline) < new Date() && !isComplete ? 'text-red-soft font-medium' : ''}`}>
                        <Clock size={11} />
                        {daysUntilDeadline(goal.deadline)}
                      </span>
                    )}
                  </div>
                  {!isComplete && !isPaused && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center bg-bg-elevated border border-border rounded-lg overflow-hidden">
                        <button onClick={() => setIncrementValue(prev => ({ ...prev, [goal._id]: Math.max(1, (prev[goal._id] || 1) - 1) }))}
                          className="px-2 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">−</button>
                        <span className="text-xs font-medium text-text-primary w-6 text-center">{incrementValue[goal._id] || 1}</span>
                        <button onClick={() => setIncrementValue(prev => ({ ...prev, [goal._id]: (prev[goal._id] || 1) + 1 }))}
                          className="px-2 py-1 text-xs text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors">+</button>
                      </div>
                      <button onClick={() => handleIncrement(goal)} className="btn text-xs py-1 px-3">Add</button>
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
