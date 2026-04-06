'use client'

import { useEffect, useState, useMemo } from 'react'
import { useExpenseStore, type ExpenseData } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign, Plus, Trash2, TrendingUp, TrendingDown, PieChart, Filter,
  UtensilsCrossed, Car, ShoppingBag, FileText, Pill, Gamepad2, GraduationCap, Package,
  X, Calendar, Repeat, ChevronDown
} from 'lucide-react'
import { ListSkeleton } from '@/components/Skeletons'
import { DateNavigator } from '@/components/DateNavigator'
import { toast } from '@/components/Toast'
import { DatePicker } from '@/components/DatePicker'

const CATEGORIES = [
  { id: 'food', label: 'Food', icon: UtensilsCrossed, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { id: 'transport', label: 'Transport', icon: Car, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'text-pink-400', bg: 'bg-pink-400/10' },
  { id: 'bills', label: 'Bills', icon: FileText, color: 'text-red-400', bg: 'bg-red-400/10' },
  { id: 'health', label: 'Health', icon: Pill, color: 'text-green-400', bg: 'bg-green-400/10' },
  { id: 'entertainment', label: 'Entertainment', icon: Gamepad2, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { id: 'education', label: 'Education', icon: GraduationCap, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  { id: 'other', label: 'Other', icon: Package, color: 'text-text-muted', bg: 'bg-white/[0.04]' },
] as const

export function ExpenseTrackerView() {
  const { expenses, isLoading, fetchExpenses, addExpense, deleteExpense } = useExpenseStore()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState(toISODate())
  const [form, setForm] = useState({ date: toISODate(), amount: '', category: 'food' as ExpenseData['category'], description: '', recurring: false })
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  useEffect(() => { fetchExpenses().catch(() => toast.error('Failed to load expenses')) }, [fetchExpenses])

  // Auto-cancel pending delete after 3s
  useEffect(() => {
    if (!pendingDelete) return
    const t = setTimeout(() => {
      deleteExpense(pendingDelete).catch(() => toast.error('Failed to delete'))
      setPendingDelete(null)
    }, 3000)
    return () => clearTimeout(t)
  }, [pendingDelete, deleteExpense])

  const filtered = useMemo(() => {
    const monthStr = selectedDate.slice(0, 7)
    let result = expenses.filter(e => e.date?.startsWith(monthStr))
    if (filter !== 'all') result = result.filter(e => e.category === filter)
    if (pendingDelete) result = result.filter(e => e._id !== pendingDelete)
    return result.sort((a, b) => b.date.localeCompare(a.date))
  }, [expenses, filter, selectedDate, pendingDelete])

  const stats = useMemo(() => {
    const monthStr = selectedDate.slice(0, 7)
    const thisMonth = expenses.filter(e => e.date?.startsWith(monthStr))
    const total = thisMonth.reduce((s, e) => s + (e.amount || 0), 0)
    const byCategory = CATEGORIES.map(c => ({
      ...c,
      total: thisMonth.filter(e => e.category === c.id).reduce((s, e) => s + (e.amount || 0), 0),
      count: thisMonth.filter(e => e.category === c.id).length,
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)
    const recurring = thisMonth.filter(e => e.recurring).reduce((s, e) => s + (e.amount || 0), 0)

    // Previous month comparison
    const d = new Date(selectedDate)
    d.setMonth(d.getMonth() - 1)
    const prevMonthStr = d.toISOString().slice(0, 7)
    const prevTotal = expenses.filter(e => e.date?.startsWith(prevMonthStr)).reduce((s, e) => s + (e.amount || 0), 0)
    const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : 0

    const daysInMonth = new Date(parseInt(selectedDate.slice(0, 4)), parseInt(selectedDate.slice(5, 7)), 0).getDate()
    const currentDay = selectedDate.slice(0, 7) === toISODate().slice(0, 7) ? new Date().getDate() : daysInMonth

    return { total, byCategory, recurring, count: thisMonth.length, change, avgPerDay: total / Math.max(currentDay, 1) }
  }, [expenses, selectedDate])

  const handleSubmit = async () => {
    if (!form.amount || !form.description.trim()) return
    await addExpense({ ...form, amount: parseFloat(form.amount) }).catch(() => toast.error('Failed to add expense'))
    setForm({ date: toISODate(), amount: '', category: 'food', description: '', recurring: false })
    setShowForm(false)
    toast.success('Expense added')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') setShowForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-accent" /> Expenses
          </h1>
          <DateNavigator value={selectedDate} onChange={setSelectedDate} />
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn flex items-center gap-1.5">
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : 'Add'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-accent">${stats.total.toFixed(0)}</p>
          <p className="text-[11px] text-text-secondary">This Month</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-text-primary">{stats.count}</p>
          <p className="text-[11px] text-text-secondary">Transactions</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-soft">${stats.recurring.toFixed(0)}</p>
          <p className="text-[11px] text-text-secondary">Recurring</p>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center gap-1">
            <p className="text-2xl font-bold text-green-soft">${stats.avgPerDay.toFixed(0)}</p>
            {stats.change !== 0 && (
              <span className={`text-[10px] flex items-center ${stats.change > 0 ? 'text-red-soft' : 'text-green-soft'}`}>
                {stats.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {Math.abs(stats.change).toFixed(0)}%
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-secondary">Avg/Day</p>
        </div>
      </div>

      {/* Category Breakdown */}
      {stats.byCategory.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><PieChart className="w-3.5 h-3.5 text-accent" /> Breakdown</h3>
          <div className="space-y-2.5">
            {stats.byCategory.map(c => {
              const pct = stats.total > 0 ? (c.total / stats.total) * 100 : 0
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.bg}`}>
                    <c.icon size={14} className={c.color} />
                  </div>
                  <span className="text-xs text-text-primary flex-1">{c.label} <span className="text-text-muted">({c.count})</span></span>
                  <div className="w-24 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                    <motion.div className="h-full rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
                  </div>
                  <span className="text-xs font-medium text-text-secondary w-16 text-right">${c.total.toFixed(0)} <span className="text-text-muted text-[10px]">({pct.toFixed(0)}%)</span></span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
            <div className="card space-y-3 border border-accent/20" onKeyDown={handleKeyDown}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
                    <input type="number" step="0.01" min="0" className="input w-full pl-7" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} autoFocus />
                  </div>
                </div>
                <div>
                  <DatePicker value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} label="Date" />
                </div>
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Description</label>
                <input className="input w-full" placeholder="What did you spend on?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-text-secondary block mb-1">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => setForm(f => ({ ...f, category: c.id as ExpenseData['category'] }))}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1 ${
                        form.category === c.id ? `${c.bg} ${c.color} font-medium ring-1 ring-current/20` : 'bg-bg-elevated text-text-muted hover:text-text-primary'
                      }`}>
                      <c.icon size={12} /> {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer select-none">
                  <input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} className="rounded" />
                  <Repeat className="w-3 h-3" /> Recurring
                </label>
                <button onClick={handleSubmit} disabled={!form.amount || !form.description.trim()} className="btn disabled:opacity-40 disabled:cursor-not-allowed">Add Expense</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
        <Filter className="w-3.5 h-3.5 text-text-muted shrink-0" />
        <button onClick={() => setFilter('all')} className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-accent/15 text-accent font-medium' : 'bg-bg-elevated text-text-muted'}`}>All</button>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setFilter(f => f === c.id ? 'all' : c.id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 ${
              filter === c.id ? `${c.bg} ${c.color} font-medium` : 'bg-bg-elevated text-text-muted'
            }`}>
            <c.icon size={12} /> {c.label}
          </button>
        ))}
      </div>

      {/* Pending delete undo bar */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="mb-3 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-red-soft/10 border border-red-soft/20">
              <span className="text-xs text-red-soft">Expense will be deleted</span>
              <button onClick={() => setPendingDelete(null)} className="text-xs font-semibold text-accent hover:underline">Undo</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expense List */}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 card">
          <DollarSign className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
          <p className="text-sm text-text-muted">{filter !== 'all' ? 'No expenses in this category' : 'No expenses this month'}</p>
          {filter !== 'all' && <button onClick={() => setFilter('all')} className="text-xs text-accent mt-2 hover:underline">Clear filter</button>}
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((e, i) => {
            const cat = CATEGORIES.find(c => c.id === e.category) || CATEGORIES[CATEGORIES.length - 1]
            return (
              <motion.div key={e._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="card group flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cat.bg}`}>
                  <cat.icon size={16} className={cat.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-primary truncate">{e.description}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-text-muted flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{formatDate(e.date)}</span>
                    {e.recurring && <span className="text-[10px] text-orange-400 flex items-center gap-0.5"><Repeat className="w-2.5 h-2.5" />Recurring</span>}
                  </div>
                </div>
                <span className="text-sm font-semibold text-accent whitespace-nowrap">${(e.amount || 0).toFixed(2)}</span>
                <button onClick={() => setPendingDelete(e._id)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-red-soft hover:bg-red-soft/10 md:opacity-0 md:group-hover:opacity-100 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
