'use client'

import { useEffect, useState, useMemo } from 'react'
import { useWishlistStore, type WishlistData } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Plus, Trash2, Check, ExternalLink, ShoppingCart, Target, Plane, BookOpen, MessageCircle, Undo2, Clock, PlusCircle, CheckCircle2, History } from 'lucide-react'
import { ListSkeleton } from '@/components/Skeletons'
import { toast } from '@/components/Toast'

const CATEGORIES = [
  { id: 'buy', label: 'Buy', icon: ShoppingCart },
  { id: 'experience', label: 'Experience', icon: Target },
  { id: 'travel', label: 'Travel', icon: Plane },
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'other', label: 'Other', icon: MessageCircle },
] as const

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-soft',
  medium: 'text-accent',
  low: 'text-text-muted',
}

export function WishlistView() {
  const { items, isLoading, fetchItems, addItem, updateItem, deleteItem } = useWishlistStore()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [showCompleted, setShowCompleted] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ item: WishlistData; timer: NodeJS.Timeout } | null>(null)
  const [form, setForm] = useState({ name: '', category: 'buy' as WishlistData['category'], priority: 'medium' as WishlistData['priority'], estimatedCost: '', url: '', notes: '' })

  useEffect(() => { fetchItems().catch(() => toast.error('Failed to load wishlist')) }, [fetchItems])

  const filtered = useMemo(() => {
    let list = items.filter(i => i._id !== pendingDelete?.item._id)
    if (!showCompleted) list = list.filter(i => !i.completed)
    if (filter !== 'all') list = list.filter(i => i.category === filter)
    return list
  }, [items, filter, showCompleted, pendingDelete])

  const stats = useMemo(() => ({
    total: items.filter(i => !i.completed).length,
    completed: items.filter(i => i.completed).length,
    totalCost: items.filter(i => !i.completed).reduce((s, i) => s + i.estimatedCost, 0),
  }), [items])

  // Activity log: sorted by most recent activity
  const activityLog = useMemo(() => {
    const events: { type: 'added' | 'completed'; name: string; category: WishlistData['category']; priority: WishlistData['priority']; cost: number; date: string }[] = []
    items.forEach(item => {
      events.push({ type: 'added', name: item.name, category: item.category, priority: item.priority, cost: item.estimatedCost, date: item.createdAt })
      if (item.completed && item.updatedAt) {
        events.push({ type: 'completed', name: item.name, category: item.category, priority: item.priority, cost: item.estimatedCost, date: item.updatedAt })
      }
    })
    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [items])

  // Group log by date
  const groupedLog = useMemo(() => {
    const groups: { label: string; events: typeof activityLog }[] = []
    const groupMap = new Map<string, typeof activityLog>()
    const now = new Date()
    const today = now.toDateString()
    const yesterday = new Date(now.getTime() - 86400000).toDateString()

    activityLog.forEach(evt => {
      const d = new Date(evt.date)
      const ds = d.toDateString()
      let label: string
      if (ds === today) label = 'Today'
      else if (ds === yesterday) label = 'Yesterday'
      else label = d.toLocaleDateString('en', { month: 'long', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })

      if (!groupMap.has(label)) { groupMap.set(label, []); groups.push({ label, events: groupMap.get(label)! }) }
      groupMap.get(label)!.push(evt)
    })
    return groups
  }, [activityLog])

  // Log stats
  const logStats = useMemo(() => {
    const now = new Date()
    const thisMonth = items.filter(i => new Date(i.createdAt).getMonth() === now.getMonth() && new Date(i.createdAt).getFullYear() === now.getFullYear())
    const completedThisMonth = items.filter(i => i.completed && i.updatedAt && new Date(i.updatedAt).getMonth() === now.getMonth() && new Date(i.updatedAt).getFullYear() === now.getFullYear())
    const avgTime = items.filter(i => i.completed && i.updatedAt).map(i => new Date(i.updatedAt!).getTime() - new Date(i.createdAt).getTime())
    const avgDays = avgTime.length > 0 ? Math.round(avgTime.reduce((a, b) => a + b, 0) / avgTime.length / 86400000) : 0
    const costFulfilled = items.filter(i => i.completed).reduce((s, i) => s + i.estimatedCost, 0)
    return {
      addedThisMonth: thisMonth.length,
      completedThisMonth: completedThisMonth.length,
      avgDaysToComplete: avgDays,
      costFulfilled,
    }
  }, [items])

  const [logFilter, setLogFilter] = useState<'all' | 'added' | 'completed'>('all')

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  const handleAdd = async () => {
    if (!form.name) return
    await addItem({
      ...form,
      estimatedCost: parseFloat(form.estimatedCost) || 0,
      completed: false,
    }).catch(() => toast.error('Failed to add item'))
    setForm({ name: '', category: 'buy', priority: 'medium', estimatedCost: '', url: '', notes: '' })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Gift className="w-6 h-6 text-accent" /> Wishlist
          </h1>
          <p className="text-text-muted text-xs mt-0.5">{stats.total} items · ${stats.totalCost.toLocaleString()} estimated</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLog(!showLog)} className={`btn-ghost p-2 ${showLog ? 'bg-accent/10 text-accent' : ''}`} title="Activity log"><History className="w-4 h-4" /></button>
          <button onClick={() => setShowForm(!showForm)} className="btn flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-accent">{stats.total}</p>
          <p className="text-[11px] text-text-secondary">Wants</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-soft">{stats.completed}</p>
          <p className="text-[11px] text-text-secondary">Got</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-soft">${stats.totalCost.toLocaleString()}</p>
          <p className="text-[11px] text-text-secondary">Total Cost</p>
        </div>
      </div>

      {/* Activity Log */}
      <AnimatePresence>
        {showLog && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-accent" /> Activity Log
                </h3>
                <div className="flex gap-1">
                  {(['all', 'added', 'completed'] as const).map(f => (
                    <button key={f} onClick={() => setLogFilter(f)} className={`px-2 py-0.5 rounded-md text-[10px] transition-colors ${logFilter === f ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-secondary'}`}>
                      {f === 'all' ? 'All' : f === 'added' ? 'Added' : 'Got'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Log Summary */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="p-2 rounded-lg bg-bg-elevated text-center">
                  <p className="text-sm font-bold text-accent">{logStats.addedThisMonth}</p>
                  <p className="text-[9px] text-text-muted">Added this mo.</p>
                </div>
                <div className="p-2 rounded-lg bg-bg-elevated text-center">
                  <p className="text-sm font-bold text-green-soft">{logStats.completedThisMonth}</p>
                  <p className="text-[9px] text-text-muted">Got this mo.</p>
                </div>
                <div className="p-2 rounded-lg bg-bg-elevated text-center">
                  <p className="text-sm font-bold text-blue-soft">{logStats.avgDaysToComplete}d</p>
                  <p className="text-[9px] text-text-muted">Avg. to get</p>
                </div>
                <div className="p-2 rounded-lg bg-bg-elevated text-center">
                  <p className="text-sm font-bold text-purple-soft">${logStats.costFulfilled.toLocaleString()}</p>
                  <p className="text-[9px] text-text-muted">Spent (got)</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="max-h-[350px] overflow-y-auto -mx-1 px-1 space-y-3">
                {groupedLog.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-6">No activity yet. Add your first wishlist item!</p>
                ) : groupedLog.map(group => {
                  const filteredEvents = logFilter === 'all' ? group.events : group.events.filter(e => e.type === logFilter)
                  if (filteredEvents.length === 0) return null
                  return (
                    <div key={group.label}>
                      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">{group.label}</p>
                      <div className="relative pl-4 border-l border-border/40 space-y-0">
                        {filteredEvents.map((evt, i) => {
                          const cat = CATEGORIES.find(c => c.id === evt.category)
                          const CatIcon = cat?.icon || MessageCircle
                          const time = new Date(evt.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
                          return (
                            <div key={`${evt.date}-${i}`} className="relative flex items-start gap-2.5 py-1.5 group/evt">
                              {/* Timeline dot */}
                              <div className={`absolute -left-[21px] top-2.5 w-2.5 h-2.5 rounded-full border-2 border-bg-primary ${evt.type === 'added' ? 'bg-accent' : 'bg-green-soft'}`} />
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${evt.type === 'added' ? 'bg-accent/10' : 'bg-green-soft/10'}`}>
                                {evt.type === 'added' ? <PlusCircle className="w-3 h-3 text-accent" /> : <CheckCircle2 className="w-3 h-3 text-green-soft" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[10px] font-semibold ${evt.type === 'added' ? 'text-accent' : 'text-green-soft'}`}>
                                    {evt.type === 'added' ? 'Added' : 'Got it!'}
                                  </span>
                                  <span className="text-xs font-medium text-text-primary truncate">{evt.name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-text-muted">{time}</span>
                                  <CatIcon className="w-2.5 h-2.5 text-text-muted" />
                                  <span className="text-[10px] text-text-muted">{cat?.label || evt.category}</span>
                                  {evt.cost > 0 && <span className="text-[10px] text-accent">${evt.cost.toLocaleString()}</span>}
                                  <span className={`text-[10px] ${PRIORITY_COLORS[evt.priority]}`}>● {evt.priority}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
            <div className="card space-y-3">
              <input className="input w-full" placeholder="What do you want?" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <div className="grid grid-cols-3 gap-3">
                <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as WishlistData['category'] }))}>
                  {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as WishlistData['priority'] }))}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <input type="number" className="input" placeholder="Cost $" value={form.estimatedCost} onChange={e => setForm(f => ({ ...f, estimatedCost: e.target.value }))} />
              </div>
              <input className="input w-full" placeholder="URL (optional)" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
              <input className="input w-full" placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <button onClick={handleAdd} className="btn w-full">Add to Wishlist</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <button onClick={() => setFilter('all')} className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-accent/15 text-accent' : 'bg-bg-elevated text-text-muted'}`}>All</button>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)} className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 ${filter === c.id ? 'bg-accent/15 text-accent' : 'bg-bg-elevated text-text-muted'}`}><c.icon size={12} /> {c.label}</button>
        ))}
        <div className="flex-1" />
        <button onClick={() => setShowCompleted(!showCompleted)} className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors ${showCompleted ? 'bg-green-soft/15 text-green-soft' : 'bg-bg-elevated text-text-muted'}`}>
          {showCompleted ? 'Showing done' : 'Show done'}
        </button>
      </div>

      {/* Undo bar */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-red-soft/10 border border-red-soft/20">
              <span className="text-xs text-red-soft">"{pendingDelete.item.name}" will be removed</span>
              <button onClick={() => { clearTimeout(pendingDelete.timer); setPendingDelete(null) }} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 font-medium"><Undo2 className="w-3 h-3" /> Undo</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Items */}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence>
            {filtered.map(item => {
              const cat = CATEGORIES.find(c => c.id === item.category)
              return (
                <motion.div key={item._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className={`card flex items-center gap-3 group ${item.completed ? 'opacity-60' : ''}`}>
                  <button onClick={() => updateItem(item._id, { completed: !item.completed }).catch(() => toast.error('Failed to update'))} className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${item.completed ? 'bg-green-soft/15 border-green-soft text-green-soft' : 'border-border hover:border-accent'}`}>
                    {item.completed && <Check className="w-3.5 h-3.5" />}
                  </button>
                  {cat ? <cat.icon size={18} className="text-text-muted" /> : <MessageCircle size={18} className="text-text-muted" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${item.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.notes && <span className="text-[11px] text-text-secondary truncate max-w-[150px]">{item.notes}</span>}
                      <span className={`text-[11px] ${PRIORITY_COLORS[item.priority]}`}>● {item.priority}</span>
                      <span className="text-[10px] text-text-muted">· {formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                  {item.estimatedCost > 0 && <span className="text-xs font-medium text-accent">${item.estimatedCost.toLocaleString()}</span>}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-ghost p-1"><ExternalLink className="w-3 h-3" /></a>
                  )}
                  <button onClick={() => {
                    if (pendingDelete) { clearTimeout(pendingDelete.timer); deleteItem(pendingDelete.item._id).catch(() => toast.error('Failed to delete')) }
                    const timer = setTimeout(() => { deleteItem(item._id).catch(() => toast.error('Failed to delete')); setPendingDelete(null) }, 3500)
                    setPendingDelete({ item, timer })
                  }} className="btn-ghost p-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
