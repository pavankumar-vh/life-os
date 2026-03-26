'use client'

import { useEffect, useState, useMemo } from 'react'
import { useWishlistStore, type WishlistData } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, Plus, Trash2, Check, ExternalLink, ShoppingCart, Target, Plane, BookOpen, MessageCircle } from 'lucide-react'

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
  const [form, setForm] = useState({ name: '', category: 'buy' as WishlistData['category'], priority: 'medium' as WishlistData['priority'], estimatedCost: '', url: '', notes: '' })

  useEffect(() => { fetchItems().catch(() => {}) }, [fetchItems])

  const filtered = useMemo(() => {
    let list = items
    if (!showCompleted) list = list.filter(i => !i.completed)
    if (filter !== 'all') list = list.filter(i => i.category === filter)
    return list
  }, [items, filter, showCompleted])

  const stats = useMemo(() => ({
    total: items.filter(i => !i.completed).length,
    completed: items.filter(i => i.completed).length,
    totalCost: items.filter(i => !i.completed).reduce((s, i) => s + i.estimatedCost, 0),
  }), [items])

  const handleAdd = async () => {
    if (!form.name) return
    await addItem({
      ...form,
      estimatedCost: parseFloat(form.estimatedCost) || 0,
      completed: false,
    }).catch(() => {})
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
        <button onClick={() => setShowForm(!showForm)} className="btn flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-accent">{stats.total}</p>
          <p className="text-[9px] text-text-muted">Wants</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-soft">{stats.completed}</p>
          <p className="text-[9px] text-text-muted">Got</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-soft">${stats.totalCost.toLocaleString()}</p>
          <p className="text-[9px] text-text-muted">Total Cost</p>
        </div>
      </div>

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

      {/* Items */}
      {isLoading ? (
        <div className="text-center py-12 text-text-muted text-sm">Loading...</div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {filtered.map(item => {
              const cat = CATEGORIES.find(c => c.id === item.category)
              return (
                <motion.div key={item._id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className={`card flex items-center gap-3 group ${item.completed ? 'opacity-60' : ''}`}>
                  <button onClick={() => updateItem(item._id, { completed: !item.completed }).catch(() => {})} className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${item.completed ? 'bg-green-soft/15 border-green-soft text-green-soft' : 'border-border hover:border-accent'}`}>
                    {item.completed && <Check className="w-3.5 h-3.5" />}
                  </button>
                  {cat ? <cat.icon size={18} className="text-text-muted" /> : <MessageCircle size={18} className="text-text-muted" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${item.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.notes && <span className="text-[9px] text-text-muted truncate max-w-[150px]">{item.notes}</span>}
                      <span className={`text-[9px] ${PRIORITY_COLORS[item.priority]}`}>● {item.priority}</span>
                    </div>
                  </div>
                  {item.estimatedCost > 0 && <span className="text-xs font-medium text-accent">${item.estimatedCost.toLocaleString()}</span>}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-ghost p-1"><ExternalLink className="w-3 h-3" /></a>
                  )}
                  <button onClick={() => deleteItem(item._id).catch(() => {})} className="btn-ghost p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
