'use client'

import { useEffect, useState, useMemo } from 'react'
import { useProjectStore, type ProjectData, type ProjectTask } from '@/store'
import { formatDate, toISODate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderKanban, Plus, Trash2, CheckCircle2, Circle, ChevronDown, Calendar, Clock, Filter, X, Undo2, Play, Flag, Archive } from 'lucide-react'
import { ListSkeleton } from '@/components/Skeletons'
import { toast } from '@/components/Toast'
import { DatePicker } from '@/components/DatePicker'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-soft/15 text-green-soft',
  completed: 'bg-accent/15 text-accent',
  'on-hold': 'bg-orange-400/15 text-orange-400',
  archived: 'bg-text-muted/15 text-text-muted',
}

const DATE_FILTERS = [
  { id: 'all', label: 'All Time' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
]

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'on-hold', label: 'On Hold' },
  { id: 'completed', label: 'Completed' },
  { id: 'archived', label: 'Archived' },
]

function ProjectCard({ project, expandedId, setExpandedId, toggleTask, addTask, newTaskText, setNewTaskText, handleStatusChange, deleteProject, pendingDelete, setPendingDelete, dimmed }: {
  project: ProjectData
  expandedId: string | null
  setExpandedId: (id: string | null) => void
  toggleTask: (p: ProjectData, i: number) => void
  addTask: (p: ProjectData) => void
  newTaskText: Record<string, string>
  setNewTaskText: React.Dispatch<React.SetStateAction<Record<string, string>>>
  handleStatusChange: (p: ProjectData, s: ProjectData['status']) => void
  deleteProject: (id: string) => Promise<void>
  pendingDelete: { project: ProjectData; timer: NodeJS.Timeout } | null
  setPendingDelete: React.Dispatch<React.SetStateAction<{ project: ProjectData; timer: NodeJS.Timeout } | null>>
  dimmed?: boolean
}) {
  const isExpanded = expandedId === project._id
  const doneTasks = project.tasks.filter(t => t.done).length
  const duration = (() => {
    const start = project.startedAt || project.createdAt?.slice(0, 10)
    const end = project.completedAt || (project.status !== 'completed' ? toISODate() : null)
    if (!start || !end) return null
    const days = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000))
    return days < 30 ? `${days}d` : days < 365 ? `${Math.round(days / 30)}mo` : `${(days / 365).toFixed(1)}y`
  })()

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className={`card ${dimmed ? 'opacity-70' : ''}`}>
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : project._id)}>
        <div className={`w-3 h-8 rounded-full ${dimmed ? 'opacity-50' : ''}`} style={{ backgroundColor: project.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-text-primary truncate">{project.name}</p>
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[project.status]}`}>{project.status}</span>
          </div>
          {dimmed && project.completedAt ? (
            <p className="text-xs text-text-muted mt-0.5">Completed {formatDate(project.completedAt)}{duration ? ` · ${duration}` : ''}</p>
          ) : project.description ? (
            <p className="text-xs text-text-muted mt-0.5 truncate">{project.description}</p>
          ) : null}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-accent">{project.progress}%</p>
          <p className="text-xs text-text-muted">{doneTasks}/{project.tasks.length} tasks</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </div>

      <div className="h-1 bg-bg-elevated rounded-full overflow-hidden mt-3">
        <motion.div className="h-full rounded-full" style={{ backgroundColor: project.color }} initial={{ width: 0 }} animate={{ width: `${project.progress}%` }} transition={{ duration: 0.5 }} />
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-3 mt-3 border-t border-border">
              <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-text-muted">
                {project.startedAt && (
                  <span className="flex items-center gap-1"><Play className="w-3 h-3 text-green-soft" /> Started {formatDate(project.startedAt)}</span>
                )}
                {project.completedAt && (
                  <span className="flex items-center gap-1"><Flag className="w-3 h-3 text-accent" /> Completed {formatDate(project.completedAt)}</span>
                )}
                {duration && (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-text-muted" /> {duration}</span>
                )}
                {project.deadline && (
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-orange-400" /> Due {formatDate(project.deadline)}</span>
                )}
              </div>

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

              <div className="flex gap-2 mt-3">
                <input className="input flex-1 text-xs" placeholder="Add task..." value={newTaskText[project._id] || ''} onChange={e => setNewTaskText(prev => ({ ...prev, [project._id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addTask(project)} />
                <button onClick={() => addTask(project)} className="btn text-xs">Add</button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-border">
                {(['active', 'completed', 'on-hold', 'archived'] as const).map(s => (
                  <button key={s} onClick={() => project.status !== s && handleStatusChange(project, s)} className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${project.status === s ? STATUS_COLORS[s] + ' ring-1 ring-current/20' : 'text-text-muted hover:bg-bg-elevated'}`}>
                    {s === 'on-hold' ? 'On Hold' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
                <div className="flex-1" />
                <button onClick={() => {
                  if (pendingDelete) { clearTimeout(pendingDelete.timer); deleteProject(pendingDelete.project._id).catch(() => toast.error('Failed to delete')) }
                  const timer = setTimeout(() => { deleteProject(project._id).catch(() => toast.error('Failed to delete')); setPendingDelete(null) }, 3500)
                  setPendingDelete({ project, timer })
                }} className="btn-danger text-xs flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function ProjectsView() {
  const { projects, isLoading, fetchProjects, addProject, updateProject, deleteProject } = useProjectStore()
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newTaskText, setNewTaskText] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ name: '', description: '', color: '#e8d5b7', deadline: '' })
  const [dateFilter, setDateFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusTab, setStatusTab] = useState('all')
  const [pendingDelete, setPendingDelete] = useState<{ project: ProjectData; timer: NodeJS.Timeout } | null>(null)

  useEffect(() => { fetchProjects().catch(() => toast.error('Failed to load projects')) }, [fetchProjects])

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
      startedAt: toISODate(),
      completedAt: null,
      tasks: [],
    }).catch(() => toast.error('Failed to create project'))
    setForm({ name: '', description: '', color: '#e8d5b7', deadline: '' })
    setShowForm(false)
  }

  const handleStatusChange = async (project: ProjectData, newStatus: ProjectData['status']) => {
    const updates: Partial<ProjectData> = { status: newStatus }
    if (newStatus === 'active' && !project.startedAt) updates.startedAt = toISODate()
    if (newStatus === 'completed') updates.completedAt = toISODate()
    if (newStatus !== 'completed') updates.completedAt = null
    await updateProject(project._id, updates).catch(() => toast.error('Failed to update status'))
  }

  const filteredProjects = useMemo(() => {
    if (dateFilter === 'all') return projects
    const now = new Date()
    let from = '', to = ''
    if (dateFilter === 'month') {
      from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      to = toISODate()
    } else if (dateFilter === 'year') {
      from = `${now.getFullYear()}-01-01`
      to = toISODate()
    } else if (dateFilter === 'custom') {
      from = dateFrom
      to = dateTo
    }
    return projects.filter(p => {
      const date = p.startedAt || p.createdAt?.slice(0, 10) || ''
      if (from && date < from) return false
      if (to && date > to) return false
      return true
    })
  }, [projects, dateFilter, dateFrom, dateTo])

  const activeProjects = filteredProjects.filter(p => p.status !== 'completed' && p.status !== 'archived')
  const completedProjects = filteredProjects.filter(p => p.status === 'completed' || p.status === 'archived')

  const visibleProjects = statusTab === 'all' ? filteredProjects : filteredProjects.filter(p => p.status === statusTab)

  const toggleTask = async (project: ProjectData, taskIdx: number) => {
    const tasks = project.tasks.map((t, i) => i === taskIdx ? { ...t, done: !t.done } : t)
    const done = tasks.filter(t => t.done).length
    const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
    await updateProject(project._id, { tasks, progress }).catch(() => toast.error('Failed to update task'))
  }

  const addTask = async (project: ProjectData) => {
    const text = newTaskText[project._id]?.trim()
    if (!text) return
    const tasks = [...project.tasks, { text, done: false }]
    const progress = tasks.length > 0 ? Math.round(tasks.filter(t => t.done).length / tasks.length * 100) : 0
    await updateProject(project._id, { tasks, progress }).catch(() => toast.error('Failed to add task'))
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
                  <DatePicker value={form.deadline} onChange={v => setForm(f => ({ ...f, deadline: v }))} label="Deadline" placeholder="Set deadline" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Color</label>
                  <input type="color" className="w-full h-9 rounded-lg cursor-pointer bg-transparent" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                </div>
              </div>
              <button onClick={handleAdd} className="btn w-full">Create Project</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Tabs */}
      <div className="flex items-center gap-1 mb-3 overflow-x-auto scrollbar-none">
        {STATUS_TABS.map(tab => (
          <button key={tab.id} onClick={() => setStatusTab(tab.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${statusTab === tab.id ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'}`}>
            {tab.label}
            {tab.id !== 'all' && <span className="ml-1 text-[10px] opacity-60">{projects.filter(p => p.status === tab.id).length}</span>}
          </button>
        ))}
      </div>

      {/* Timeline Filter */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-text-muted" />
        {DATE_FILTERS.map(f => (
          <button key={f.id} onClick={() => setDateFilter(f.id)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${dateFilter === f.id ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'}`}>
            {f.label}
          </button>
        ))}
        {dateFilter !== 'all' && (
          <button onClick={() => setDateFilter('all')} className="p-1 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {dateFilter === 'custom' && (
        <div className="flex items-center gap-2 mb-4">
          <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="From" />
          <span className="text-xs text-text-muted">to</span>
          <DatePicker value={dateTo} onChange={setDateTo} placeholder="To" />
        </div>
      )}

      {/* Undo bar */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-red-soft/10 border border-red-soft/20">
              <span className="text-xs text-red-soft">Project will be removed</span>
              <button onClick={() => { clearTimeout(pendingDelete.timer); setPendingDelete(null) }} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium"><Undo2 className="w-3 h-3" /> Undo</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Projects */}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : visibleProjects.filter(p => p._id !== pendingDelete?.project._id).length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No {statusTab === 'all' ? '' : statusTab + ' '}projects found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active section (when showing all) */}
          {statusTab === 'all' && activeProjects.filter(p => p._id !== pendingDelete?.project._id).length > 0 && (
            <AnimatePresence initial={false}>
              {activeProjects.filter(p => p._id !== pendingDelete?.project._id).map(project => (
                <ProjectCard key={project._id} project={project} expandedId={expandedId} setExpandedId={setExpandedId} toggleTask={toggleTask} addTask={addTask} newTaskText={newTaskText} setNewTaskText={setNewTaskText} handleStatusChange={handleStatusChange} deleteProject={deleteProject} pendingDelete={pendingDelete} setPendingDelete={setPendingDelete} />
              ))}
            </AnimatePresence>
          )}

          {/* Completed / Archived divider (when showing all) */}
          {statusTab === 'all' && completedProjects.filter(p => p._id !== pendingDelete?.project._id).length > 0 && (
            <>
              <div className="flex items-center gap-2 mt-6 mb-2">
                <CheckCircle2 className="w-4 h-4 text-accent/50" />
                <p className="text-xs font-medium text-text-muted">Completed / Archived</p>
                <div className="flex-1 h-px bg-border" />
              </div>
              <AnimatePresence initial={false}>
                {completedProjects.filter(p => p._id !== pendingDelete?.project._id).map(project => (
                  <ProjectCard key={project._id} project={project} expandedId={expandedId} setExpandedId={setExpandedId} toggleTask={toggleTask} addTask={addTask} newTaskText={newTaskText} setNewTaskText={setNewTaskText} handleStatusChange={handleStatusChange} deleteProject={deleteProject} pendingDelete={pendingDelete} setPendingDelete={setPendingDelete} dimmed />
                ))}
              </AnimatePresence>
            </>
          )}

          {/* Filtered by specific status tab */}
          {statusTab !== 'all' && (
            <AnimatePresence initial={false}>
              {visibleProjects.filter(p => p._id !== pendingDelete?.project._id).map(project => (
                <ProjectCard key={project._id} project={project} expandedId={expandedId} setExpandedId={setExpandedId} toggleTask={toggleTask} addTask={addTask} newTaskText={newTaskText} setNewTaskText={setNewTaskText} handleStatusChange={handleStatusChange} deleteProject={deleteProject} pendingDelete={pendingDelete} setPendingDelete={setPendingDelete} dimmed={project.status === 'completed' || project.status === 'archived'} />
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  )
}
