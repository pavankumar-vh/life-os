'use client'

import { useEffect, useState, useMemo } from 'react'
import { useTasksStore, useGoalsStore, type TaskData } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, ListChecks, Search, Calendar, Flag, Edit3, Check, Clock, AlertTriangle, Target } from 'lucide-react'

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-text-muted', bg: 'bg-bg-elevated' },
  { value: 'medium', label: 'Medium', color: 'text-blue-soft', bg: 'bg-blue-soft/10' },
  { value: 'high', label: 'High', color: 'text-orange-soft', bg: 'bg-orange-soft/10' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-soft', bg: 'bg-red-soft/10' },
] as const

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
] as const

const STATUS_ICONS: Record<string, React.ReactNode> = {
  'todo': <div className="w-3 h-3 rounded-full border-2 border-text-muted" />,
  'in-progress': <Clock className="w-3 h-3 text-accent" />,
  'done': <Check className="w-3 h-3 text-green-soft" />,
}

export function TasksView() {
  const { tasks, isLoading, fetchTasks, addTask, updateTask, deleteTask } = useTasksStore()
  const { goals, fetchGoals } = useGoalsStore()
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskData['priority']>('medium')
  const [dueDate, setDueDate] = useState('')
  const [goalId, setGoalId] = useState('')

  useEffect(() => { fetchTasks().catch(() => {}); fetchGoals().catch(() => {}) }, [fetchTasks, fetchGoals])

  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
    completionRate: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0,
  }), [tasks])

  const filtered = useMemo(() => {
    return tasks
      .filter(t => statusFilter === 'all' || t.status === statusFilter)
      .filter(t => priorityFilter === 'all' || t.priority === priorityFilter)
      .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        const statusOrder = { 'in-progress': 0, 'todo': 1, 'done': 2 }
        if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status]
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })
  }, [tasks, statusFilter, priorityFilter, search])

  const handleAdd = async () => {
    if (!title.trim()) return
    await addTask({ title, description, priority, status: 'todo', dueDate: dueDate || null, goalId: goalId || null })
    setTitle(''); setDescription(''); setPriority('medium'); setDueDate(''); setGoalId('')
    setShowAdd(false)
  }

  const cycleStatus = async (task: TaskData) => {
    const next: Record<string, TaskData['status']> = { 'todo': 'in-progress', 'in-progress': 'done', 'done': 'todo' }
    await updateTask(task._id, { status: next[task.status] })
  }

  const isOverdue = (task: TaskData) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done'

  const formatDueDate = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return `${Math.abs(diff)}d overdue`
    if (diff === 0) return 'Due today'
    if (diff === 1) return 'Due tomorrow'
    if (diff <= 7) return `${diff}d left`
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
  }

  const getPriInfo = (p: string) => PRIORITIES.find(pr => pr.value === p) || PRIORITIES[1]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-accent" /> Tasks
          </h1>
          <p className="text-text-muted text-xs mt-0.5">{stats.total} total · {stats.completionRate}% done</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn flex items-center gap-2"><Plus className="w-4 h-4" /> Add Task</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'To Do', value: stats.todo, color: 'text-text-muted' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-accent' },
          { label: 'Done', value: stats.done, color: 'text-green-soft' },
          { label: 'Overdue', value: stats.overdue, color: 'text-red-soft' },
          { label: 'Completion', value: `${stats.completionRate}%`, color: 'text-accent' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." className="input w-full pl-9 text-xs" />
        </div>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input text-xs">
          <option value="all">All Priorities</option>
          {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 mb-5 bg-bg-elevated rounded-lg p-1">
        {STATUS_TABS.map(tab => (
          <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
            className={`flex-1 py-1.5 text-xs rounded-md transition-all ${
              statusFilter === tab.value ? 'bg-bg-surface text-accent font-medium shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}>{tab.label} {tab.value === 'all' ? `(${stats.total})` :
              tab.value === 'todo' ? `(${stats.todo})` :
              tab.value === 'in-progress' ? `(${stats.inProgress})` :
              `(${stats.done})`}</button>
        ))}
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="card border-accent/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">New Task</h3>
                <button onClick={() => setShowAdd(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
              </div>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="input w-full mb-3" autoFocus />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" className="input w-full mb-3 min-h-[60px] text-xs" />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="text-[10px] text-text-muted uppercase block mb-1">Priority</label>
                  <select value={priority} onChange={(e) => setPriority(e.target.value as TaskData['priority'])} className="input text-xs w-full">
                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-text-muted uppercase block mb-1">Due Date</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input text-xs w-full" />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted uppercase block mb-1">Goal</label>
                  <select value={goalId} onChange={(e) => setGoalId(e.target.value)} className="input text-xs w-full">
                    <option value="">None</option>
                    {goals.filter(g => g.status === 'active').map(g => <option key={g._id} value={g._id}>{g.title}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleAdd} className="btn w-full">Create Task</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task List */}
      {isLoading ? (
        <div className="text-center py-12"><p className="text-sm text-text-muted animate-pulse">Loading tasks...</p></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 card"><p className="text-sm text-text-muted">{search || statusFilter !== 'all' ? 'No matching tasks' : 'No tasks yet'}</p></div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(task => {
            const pri = getPriInfo(task.priority)
            const overdue = isOverdue(task)
            const linkedGoal = task.goalId ? goals.find(g => g._id === task.goalId) : null
            return (
              <motion.div key={task._id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`card group flex items-start gap-3 ${task.status === 'done' ? 'opacity-60' : ''}`}>
                <button onClick={() => cycleStatus(task)} className="mt-0.5 shrink-0">{STATUS_ICONS[task.status]}</button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-text-muted' : 'text-text-primary'}`}>{task.title}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${pri.color} ${pri.bg}`}>{pri.label}</span>
                  </div>
                  {task.description && <p className="text-[11px] text-text-muted mt-0.5 line-clamp-1">{task.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-text-muted">
                    {task.dueDate && (
                      <span className={`flex items-center gap-1 ${overdue ? 'text-red-soft font-medium' : ''}`}>
                        {overdue ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                        {formatDueDate(task.dueDate)}
                      </span>
                    )}
                    {linkedGoal && <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {linkedGoal.title}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <button onClick={() => deleteTask(task._id)} className="text-text-muted hover:text-red-soft"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
