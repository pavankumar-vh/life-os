'use client'

import { useEffect, useState } from 'react'
import { useTasksStore, type TaskData } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, Plus, Trash2, X, Circle, CheckCircle2, Clock } from 'lucide-react'

const PRIORITIES: TaskData['priority'][] = ['low', 'medium', 'high', 'urgent']
const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-text-muted border-text-muted',
  medium: 'text-brutal-yellow border-brutal-yellow',
  high: 'text-brutal-orange border-brutal-orange',
  urgent: 'text-brutal-red border-brutal-red',
}

const STATUS_ORDER = ['todo', 'in-progress', 'done'] as const

export function TasksView() {
  const { tasks, isLoading, fetchTasks, addTask, updateTask, deleteTask } = useTasksStore()
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskData['priority']>('medium')
  const [dueDate, setDueDate] = useState('')

  useEffect(() => { fetchTasks().catch(() => {}) }, [fetchTasks])

  const handleAdd = async () => {
    if (!title.trim()) return
    await addTask({ title, description, priority, dueDate: dueDate || null })
    setTitle(''); setDescription(''); setPriority('medium'); setDueDate('')
    setShowAdd(false)
  }

  const cycleStatus = async (task: TaskData) => {
    const nextIdx = (STATUS_ORDER.indexOf(task.status) + 1) % STATUS_ORDER.length
    await updateTask(task._id, { status: STATUS_ORDER[nextIdx] })
  }

  const todoCount = tasks.filter((t) => t.status === 'todo').length
  const inProgressCount = tasks.filter((t) => t.status === 'in-progress').length
  const doneCount = tasks.filter((t) => t.status === 'done').length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-brutal-yellow" />
            Tasks
          </h1>
          <p className="text-text-muted font-mono text-sm mt-1">
            {todoCount} todo · {inProgressCount} in progress · {doneCount} done
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="brutal-btn flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Add Task */}
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
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider">New Task</h3>
                <button onClick={() => setShowAdd(false)}>
                  <X className="w-4 h-4 text-text-muted hover:text-text-primary" />
                </button>
              </div>

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title..."
                className="brutal-input w-full mb-3"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                autoFocus
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)..."
                className="brutal-input w-full h-16 resize-none mb-3"
              />

              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1">Priority</label>
                  <div className="flex gap-1">
                    {PRIORITIES.map((p) => (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-1.5 border-2 font-mono text-[10px] uppercase transition-all ${
                          priority === p ? PRIORITY_COLORS[p] + ' bg-white/5' : 'border-border text-text-muted'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="brutal-input text-xs"
                  />
                </div>
              </div>

              <button onClick={handleAdd} className="brutal-btn w-full">Create Task</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task Columns */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="font-mono text-sm text-text-muted animate-pulse">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 && !showAdd ? (
        <div className="text-center py-16 border-3 border-dashed border-border">
          <CheckSquare className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="font-mono text-sm text-text-muted">No tasks yet</p>
        </div>
      ) : (
        <div className="space-y-6">
          {STATUS_ORDER.map((status) => {
            const statusTasks = tasks.filter((t) => t.status === status)
            if (statusTasks.length === 0) return null
            return (
              <div key={status}>
                <h3 className="font-mono text-xs uppercase tracking-widest text-text-muted mb-2 flex items-center gap-2">
                  {status === 'todo' && <Circle className="w-3 h-3" />}
                  {status === 'in-progress' && <Clock className="w-3 h-3 text-brutal-blue" />}
                  {status === 'done' && <CheckCircle2 className="w-3 h-3 text-brutal-green" />}
                  {status.replace('-', ' ')} ({statusTasks.length})
                </h3>
                <div className="space-y-1">
                  {statusTasks.map((task) => (
                    <motion.div
                      key={task._id}
                      layout
                      className={`border-3 bg-bg-surface p-3 flex items-center gap-3 group transition-all ${
                        task.status === 'done' ? 'border-brutal-green/30 opacity-60' : 'border-border hover:border-border-strong'
                      }`}
                    >
                      <button onClick={() => cycleStatus(task)} className="shrink-0">
                        {task.status === 'done' ? (
                          <CheckCircle2 className="w-5 h-5 text-brutal-green" />
                        ) : task.status === 'in-progress' ? (
                          <Clock className="w-5 h-5 text-brutal-blue" />
                        ) : (
                          <Circle className="w-5 h-5 text-text-muted hover:text-brutal-yellow transition-colors" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={`font-mono text-sm ${task.status === 'done' ? 'line-through text-text-muted' : 'font-bold'}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="font-mono text-[10px] text-text-muted truncate">{task.description}</p>
                        )}
                      </div>

                      <div className={`w-2 h-2 rounded-full ${
                        task.priority === 'urgent' ? 'bg-brutal-red' :
                        task.priority === 'high' ? 'bg-brutal-orange' :
                        task.priority === 'medium' ? 'bg-brutal-yellow' : 'bg-text-muted'
                      }`} />

                      {task.dueDate && (
                        <span className="font-mono text-[10px] text-text-muted">{task.dueDate}</span>
                      )}

                      <button
                        onClick={() => deleteTask(task._id)}
                        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-brutal-red transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
