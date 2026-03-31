'use client'

import { useEffect, useState, useMemo } from 'react'
import { useExpenseStore, type ExpenseData } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Plus, Trash2, TrendingUp, PieChart, Filter, UtensilsCrossed, Car, ShoppingBag, FileText, Pill, Gamepad2, GraduationCap, Package } from 'lucide-react'
import { ListSkeleton } from '@/components/Skeletons'
import { DateNavigator } from '@/components/DateNavigator'
import { toast } from '@/components/Toast'

const CATEGORIES = [
  { id: 'food', label: 'Food', icon: UtensilsCrossed, color: 'text-orange-400' },
  { id: 'transport', label: 'Transport', icon: Car, color: 'text-blue-400' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'text-pink-400' },
  { id: 'bills', label: 'Bills', icon: FileText, color: 'text-red-400' },
  { id: 'health', label: 'Health', icon: Pill, color: 'text-green-400' },
  { id: 'entertainment', label: 'Entertainment', icon: Gamepad2, color: 'text-purple-400' },
  { id: 'education', label: 'Education', icon: GraduationCap, color: 'text-cyan-400' },
  { id: 'other', label: 'Other', icon: Package, color: 'text-text-muted' },
] as const

export function ExpenseTrackerView() {
  const { expenses, isLoading, fetchExpenses, addExpense, deleteExpense } = useExpenseStore()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState(toISODate())
  const [form, setForm] = useState({ date: toISODate(), amount: '', category: 'food' as ExpenseData['category'], description: '', recurring: false })

  useEffect(() => { fetchExpenses().catch(() => toast.error('Failed to load expenses')) }, [fetchExpenses])

  const filtered = useMemo(() => {
    const monthStr = selectedDate.slice(0, 7)
    let result = expenses.filter(e => e.date.startsWith(monthStr))
    if (filter !== 'all') result = result.filter(e => e.category === filter)
    return result
  }, [expenses, filter, selectedDate])

  const stats = useMemo(() => {
    const monthStr = selectedDate.slice(0, 7)
    const thisMonth = expenses.filter(e => e.date.startsWith(monthStr))
    const total = thisMonth.reduce((s, e) => s + e.amount, 0)
    const byCategory = CATEGORIES.map(c => ({
      ...c,
      total: thisMonth.filter(e => e.category === c.id).reduce((s, e) => s + e.amount, 0),
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)
    const recurring = thisMonth.filter(e => e.recurring).reduce((s, e) => s + e.amount, 0)
    return { total, byCategory, recurring, count: thisMonth.length }
  }, [expenses, selectedDate])

  const handleSubmit = async () => {
    if (!form.amount || !form.description) return
    await addExpense({ ...form, amount: parseFloat(form.amount) }).catch(() => toast.error('Failed to add expense'))
    setForm({ date: toISODate(), amount: '', category: 'food', description: '', recurring: false })
    setShowForm(false)
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
          <Plus className="w-3.5 h-3.5" /> Add
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
          <p className="text-2xl font-bold text-green-soft">${(stats.total / Math.max(new Date().getDate(), 1)).toFixed(0)}</p>
          <p className="text-[11px] text-text-secondary">Avg/Day</p>
        </div>
      </div>

      {/* Category Breakdown */}
      {stats.byCategory.length > 0 && (
        <div className="card mb-6">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><PieChart className="w-3.5 h-3.5 text-accent" /> Breakdown</h3>
          <div className="space-y-2">
            {stats.byCategory.map(c => {
              const pct = stats.total > 0 ? (c.total / stats.total) * 100 : 0
              return (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-6 flex items-center justify-center"><c.icon size={14} /></span>
                  <span className="text-xs text-text-primary flex-1">{c.label}</span>
                  <div className="w-24 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-text-muted w-14 text-right">${c.total.toFixed(0)}</span>
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
            <div className="card space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Amount</label>
                  <input type="number" step="0.01" className="input w-full" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-text-secondary block mb-1">Date</label>
                  <input type="date" className="input w-full" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
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
                    <button key={c.id} onClick={() => setForm(f => ({ ...f, category: c.id as ExpenseData['category'] }))} className={`px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1 ${form.category === c.id ? 'bg-accent/15 text-accent' : 'bg-bg-elevated text-text-muted hover:text-text-primary'}`}>
                      <c.icon size={14} /> {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
                  <input type="checkbox" checked={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} className="rounded" />
                  Recurring
                </label>
                <button onClick={handleSubmit} className="btn">Add Expense</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <Filter className="w-3.5 h-3.5 text-text-muted shrink-0" />
        <button onClick={() => setFilter('all')} className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-accent/15 text-accent' : 'bg-bg-elevated text-text-muted'}`}>All</button>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => setFilter(c.id)} className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors ${filter === c.id ? 'bg-accent/15 text-accent' : 'bg-bg-elevated text-text-muted'}`}>
            <c.icon size={14} />
          </button>
        ))}
      </div>

      {/* Expense List */}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {filtered.map(e => {
              const cat = CATEGORIES.find(c => c.id === e.category)
              return (
                <motion.div key={e._id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="card flex items-center gap-3">
                  <span className="w-8 flex items-center justify-center">{cat ? <cat.icon size={18} className={cat.color} /> : <Package size={18} />}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-primary truncate">{e.description}</p>
                    <p className="text-[11px] text-text-secondary">{formatDate(e.date)} {e.recurring && 'Recurring'}</p>
                  </div>
                  <span className="text-sm font-semibold text-accent">${e.amount.toFixed(2)}</span>
                  <button onClick={() => { if (confirm('Delete this expense?')) deleteExpense(e._id).catch(() => toast.error('Failed to delete')) }} className="btn-ghost p-1"><Trash2 className="w-3 h-3" /></button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
