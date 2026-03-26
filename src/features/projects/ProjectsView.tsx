'use client'

import { useEffect, useState, useMemo } from 'react'
import { useProjectStore, type ProjectData, type ProjectTask } from '@/store'
import { formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderKanban, Plus, Trash2, CheckCircle2, Circle, ChevronDown } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-soft/15 text-green-soft',
  completed: 'bg-accent/15 text-accent',
  'on-hold': 'bg-orange-400/15 text-orange-400',
  archived: 'bg-text-muted/15 text-text-muted',
}

export function ProjectsView() {
  const { projects, isLoading, fetchProjects, addProject, updateProject, deleteProject } = useProjectStore()
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newTaskText, setNewTaskText] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ name: '', description: '', color: '#e8d5b7', deadline: '' })

  useEffect(() => { fetchProjects().catch(() => {}) }, [fetchProjects])

  const stats = useMemo(() => ({
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    totalTasks: projects.reduce((s, p) => s + p.tasks.length, 0),
    doneTasks: projects.reduce((s, p) => s + p.tasks.filter(t => t.done).length, 0),
  }), [projects])

  const handleAdd = async () => {
    if (!form.name) return
    await addProject({
      ...form,
      status: 'active',
      progress: 0,
      deadline: form.deadline || null,
      tasks: [],
    }).catch(() => {})
    setForm({ name: '', description: '', color: '#e8d5b7', deadline: '' })
    setShowForm(false)
  }

  const toggleTask = async (project: ProjectData, taskIdx: number) => {
    const tasks = project.tasks.map((t, i) => i === taskIdx ? { ...t, done: !t.done } : t)
    const done = tasks.filter(t => t.done).length
    const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
    await updateProject(project._id, { tasks, progress }).catch(() => {})
  }

  const addTask = async (project: ProjectData) => {
    const text = newTaskText[project._id]?.trim()
    if (!text) return
    const tasks = [...project.tasks, { text, done: false }]
    const progress = tasks.length > 0 ? Math.round(tasks.filter(t => t.done).length / tasks.length * 100) : 0
    await updateProject(project._id, { tasks, progress }).catch(() => {})
    setNewTaskText(prev => ({ ...prev, [project._id]: '' }))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-accent" /> Projects
          </h1>
          <p className="text-text-muted text-xs mt-0.5">{stats.active} active · {stats.doneTasks}/{stats.totalTasks} tasks done</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> New</button>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
            <div className="card space-y-3">
              <input className="input w-full" placeholder="Project name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input className="input w-full" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Deadline</label>
                  <input type="date" className="input w-full" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-text-muted block mb-1">Color</label>
                  <input type="color" className="w-full h-9 rounded-lg cursor-pointer bg-transparent" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                </div>
              </div>
              <button onClick={handleAdd} className="btn w-full">Create Project</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Projects */}
      {isLoading ? (
        <div className="text-center py-12 text-text-muted text-sm">Loading...</div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {projects.map(project => {
              const isExpanded = expandedId === project._id
              const doneTasks = project.tasks.filter(t => t.done).length
              return (
                <motion.div key={project._id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="card">
                  {/* Header */}
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : project._id)}>
                    <div className="w-3 h-8 rounded-full" style={{ backgroundColor: project.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text-primary truncate">{project.name}</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[project.status]}`}>{project.status}</span>
                      </div>
                      {project.description && <p className="text-[10px] text-text-muted mt-0.5 truncate">{project.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-accent">{project.progress}%</p>
                      <p className="text-[8px] text-text-muted">{doneTasks}/{project.tasks.length} tasks</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1 bg-bg-elevated rounded-full overflow-hidden mt-3">
                    <motion.div className="h-full rounded-full" style={{ backgroundColor: project.color }} initial={{ width: 0 }} animate={{ width: `${project.progress}%` }} transition={{ duration: 0.5 }} />
                  </div>

                  {/* Expanded */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="pt-3 mt-3 border-t border-border">
                          {project.deadline && <p className="text-[10px] text-text-muted mb-2">Deadline: {formatDate(project.deadline)}</p>}

                          {/* Tasks */}
                          <div className="space-y-1.5">
                            {project.tasks.map((task, i) => (
                              <button key={i} onClick={() => toggleTask(project, i)} className="w-full flex items-center gap-2 text-left group/task">
                                {task.done ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-soft shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-text-muted group-hover/task:text-accent shrink-0" />
                                )}
                                <span className={`text-xs ${task.done ? 'line-through text-text-muted' : 'text-text-primary'}`}>{task.text}</span>
                              </button>
                            ))}
                          </div>

                          {/* Add Task */}
                          <div className="flex gap-2 mt-3">
                            <input className="input flex-1 text-xs" placeholder="Add task..." value={newTaskText[project._id] || ''} onChange={e => setNewTaskText(prev => ({ ...prev, [project._id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addTask(project)} />
                            <button onClick={() => addTask(project)} className="btn text-xs">Add</button>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
                            <select className="input text-[10px] flex-1" value={project.status} onChange={e => updateProject(project._id, { status: e.target.value as ProjectData['status'] }).catch(() => {})}>
                              <option value="active">Active</option>
                              <option value="completed">Completed</option>
                              <option value="on-hold">On Hold</option>
                              <option value="archived">Archived</option>
                            </select>
                            <button onClick={() => deleteProject(project._id).catch(() => {})} className="btn-danger text-[10px] flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
