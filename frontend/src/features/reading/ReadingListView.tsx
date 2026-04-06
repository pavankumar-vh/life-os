'use client'

import { useEffect, useState, useMemo } from 'react'
import { useBookStore, type BookData } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Trash2, Star, ChevronDown, BookMarked, CheckCircle, ClipboardList, XCircle, Calendar, Clock, X, Pencil, Filter } from 'lucide-react'
import { ListSkeleton } from '@/components/Skeletons'
import { toast } from '@/components/Toast'
import { DatePicker } from '@/components/DatePicker'

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'reading', label: 'Reading' },
  { id: 'completed', label: 'Completed' },
  { id: 'want-to-read', label: 'Want to Read' },
  { id: 'dropped', label: 'Dropped' },
]

const STATUS_ICON: Record<string, typeof BookOpen> = {
  reading: BookMarked,
  completed: CheckCircle,
  'want-to-read': ClipboardList,
  dropped: XCircle,
}

const STATUS_COLOR: Record<string, string> = {
  reading: 'text-blue-soft',
  completed: 'text-green-soft',
  'want-to-read': 'text-orange-soft',
  dropped: 'text-red-soft',
}

function daysBetween(a: string, b: string) {
  return Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

function formatShort(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ReadingListView() {
  const { books, isLoading, fetchBooks, addBook, updateBook, deleteBook } = useBookStore()
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', author: '', totalPages: '', status: 'want-to-read' as BookData['status'] })
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<'all' | 'this-month' | 'this-year' | 'custom'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => { fetchBooks().catch(() => toast.error('Failed to load books')) }, [fetchBooks])

  useEffect(() => {
    if (!pendingDelete) return
    const t = setTimeout(() => {
      deleteBook(pendingDelete).catch(() => toast.error('Failed to delete'))
      setPendingDelete(null)
    }, 3000)
    return () => clearTimeout(t)
  }, [pendingDelete, deleteBook])

  const filtered = useMemo(() => {
    let list = books
    if (tab !== 'all') list = list.filter(b => b.status === tab)
    if (pendingDelete) list = list.filter(b => b._id !== pendingDelete)
    // Date filtering
    if (dateFilter !== 'all') {
      const now = new Date()
      let from = '', to = ''
      if (dateFilter === 'this-month') {
        from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`
      } else if (dateFilter === 'this-year') {
        from = `${now.getFullYear()}-01-01`
        to = `${now.getFullYear()}-12-31`
      } else if (dateFilter === 'custom') {
        from = dateFrom
        to = dateTo
      }
      if (from || to) {
        list = list.filter(b => {
          const started = b.startDate || ''
          const finished = b.finishDate || ''
          const date = finished || started
          if (!date) return false
          if (from && date < from) return false
          if (to && date > to) return false
          return true
        })
      }
    }
    return list
  }, [books, tab, pendingDelete, dateFilter, dateFrom, dateTo])

  const stats = useMemo(() => ({
    total: books.length,
    reading: books.filter(b => b.status === 'reading').length,
    completed: books.filter(b => b.status === 'completed').length,
    totalPages: books.filter(b => b.status === 'completed').reduce((s, b) => s + b.totalPages, 0),
    avgRating: (() => {
      const rated = books.filter(b => b.rating > 0)
      return rated.length ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length) : 0
    })(),
  }), [books])

  const handleAdd = async () => {
    if (!form.title || !form.author) return
    const now = new Date().toISOString().split('T')[0]
    await addBook({
      ...form,
      totalPages: parseInt(form.totalPages) || 0,
      pagesRead: 0,
      rating: 0,
      notes: '',
      startDate: form.status === 'reading' ? now : null,
      finishDate: form.status === 'completed' ? now : null,
    }).catch(() => toast.error('Failed to add book'))
    setForm({ title: '', author: '', totalPages: '', status: 'want-to-read' })
    setShowForm(false)
    toast.success('Book added')
  }

  const handleStatusChange = async (book: BookData, status: BookData['status']) => {
    const now = new Date().toISOString().split('T')[0]
    const updates: Partial<BookData> = { status }
    if (status === 'reading' && !book.startDate) updates.startDate = now
    if (status === 'completed') {
      updates.finishDate = now
      if (!book.startDate) updates.startDate = now
    }
    if (status === 'want-to-read') { updates.startDate = null; updates.finishDate = null }
    await updateBook(book._id, updates).catch(() => toast.error('Failed to update status'))
  }

  const handleProgress = async (book: BookData, pages: number) => {
    const pagesRead = Math.min(Math.max(0, pages), book.totalPages)
    const updates: Partial<BookData> = { pagesRead }
    if (!book.startDate) updates.startDate = new Date().toISOString().split('T')[0]
    if (pagesRead >= book.totalPages && book.totalPages > 0) {
      updates.status = 'completed'
      if (!book.finishDate) updates.finishDate = new Date().toISOString().split('T')[0]
    }
    await updateBook(book._id, updates).catch(() => toast.error('Failed to update progress'))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-accent" /> Reading List
          </h1>
          <p className="text-text-muted text-xs mt-0.5">{stats.completed} books completed · {stats.totalPages.toLocaleString()} pages read</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn flex items-center gap-1.5">
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : 'Add Book'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-accent">{stats.total}</p>
          <p className="text-[11px] text-text-secondary">Total</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-soft">{stats.reading}</p>
          <p className="text-[11px] text-text-secondary">Reading</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-soft">{stats.completed}</p>
          <p className="text-[11px] text-text-secondary">Completed</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-purple-soft">{stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—'}</p>
          <p className="text-[11px] text-text-secondary">Avg Rating</p>
        </div>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
            <div className="card space-y-3 border border-accent/20">
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="Book title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowForm(false) }} />
                <input className="input" placeholder="Author" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowForm(false) }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" className="input" placeholder="Total pages" value={form.totalPages} onChange={e => setForm(f => ({ ...f, totalPages: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd() }} />
                <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as BookData['status'] }))}>
                  <option value="want-to-read">Want to Read</option>
                  <option value="reading">Reading</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <button onClick={handleAdd} disabled={!form.title || !form.author} className="btn w-full disabled:opacity-40 disabled:cursor-not-allowed">Add Book</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
        {STATUS_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-lg text-[11px] whitespace-nowrap transition-colors ${tab === t.id ? 'bg-accent/15 text-accent font-medium' : 'bg-bg-elevated text-text-muted hover:text-text-primary'}`}>{t.label}</button>
        ))}
      </div>

      {/* Date Filter */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-text-muted shrink-0" />
        {([['all', 'All Time'], ['this-month', 'This Month'], ['this-year', 'This Year'], ['custom', 'Custom']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setDateFilter(id)}
            className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 ${
              dateFilter === id ? 'bg-accent/15 text-accent font-medium' : 'bg-bg-elevated text-text-muted hover:text-text-primary'
            }`}>
            <Calendar className="w-2.5 h-2.5" />{label}
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
              <span className="text-xs text-red-soft">Book will be removed</span>
              <button onClick={() => setPendingDelete(null)} className="text-xs font-semibold text-accent hover:underline">Undo</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Books */}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 card">
          <BookOpen className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
          <p className="text-sm text-text-muted">{tab !== 'all' ? `No books ${tab === 'reading' ? 'currently reading' : tab.replace('-', ' ')}` : 'No books yet'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((book, idx) => {
            const progress = book.totalPages > 0 ? Math.round((book.pagesRead / book.totalPages) * 100) : 0
            const isExpanded = expandedId === book._id
            const duration = book.startDate && book.finishDate ? daysBetween(book.startDate, book.finishDate) : null
            const StatusIcon = STATUS_ICON[book.status] || BookOpen
            const statusColor = STATUS_COLOR[book.status] || 'text-text-muted'
            return (
              <motion.div key={book._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }} className="card">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : book._id)}>
                  <div className={`w-10 h-14 rounded-lg flex items-center justify-center shrink-0 ${
                    book.status === 'completed' ? 'bg-green-soft/10' : book.status === 'reading' ? 'bg-blue-soft/10' : 'bg-bg-elevated'
                  }`}>
                    <BookOpen size={18} className={statusColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">{book.title}</p>
                    <p className="text-[11px] text-text-muted">{book.author}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {book.totalPages > 0 && (
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1 bg-bg-elevated rounded-full overflow-hidden">
                            <motion.div className={`h-full rounded-full ${progress >= 100 ? 'bg-green-soft' : 'bg-accent'}`}
                              initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
                          </div>
                          <span className="text-[10px] text-text-muted">{progress}%</span>
                        </div>
                      )}
                      {book.startDate && (
                        <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5" />{formatShort(book.startDate)}
                        </span>
                      )}
                      {duration !== null && (
                        <span className="text-[10px] text-green-soft flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />{duration}d
                        </span>
                      )}
                    </div>
                  </div>
                  {book.rating > 0 && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < book.rating ? 'text-accent fill-accent' : 'text-text-muted/30'}`} />
                      ))}
                    </div>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${
                    book.status === 'completed' ? 'bg-green-soft/10 text-green-soft' :
                    book.status === 'reading' ? 'bg-blue-soft/10 text-blue-soft' :
                    book.status === 'dropped' ? 'bg-red-soft/10 text-red-soft' :
                    'bg-bg-elevated text-text-muted'
                  }`}>
                    {book.status === 'want-to-read' ? 'TBR' : book.status.charAt(0).toUpperCase() + book.status.slice(1)}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="pt-3 mt-3 border-t border-border space-y-3">
                        {/* Dates row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Started</label>
                            <input type="date" className="input w-full text-xs" value={book.startDate || ''}
                              onChange={e => updateBook(book._id, { startDate: e.target.value || null }).catch(() => toast.error('Failed to update'))} />
                          </div>
                          <div>
                            <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Finished</label>
                            <input type="date" className="input w-full text-xs" value={book.finishDate || ''}
                              onChange={e => updateBook(book._id, { finishDate: e.target.value || null }).catch(() => toast.error('Failed to update'))} />
                          </div>
                        </div>

                        {/* Duration display */}
                        {book.startDate && book.finishDate && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-soft/5 border border-green-soft/10">
                            <Clock className="w-3.5 h-3.5 text-green-soft" />
                            <span className="text-xs text-green-soft font-medium">Completed in {daysBetween(book.startDate, book.finishDate)} days</span>
                          </div>
                        )}
                        {book.startDate && !book.finishDate && book.status === 'reading' && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-soft/5 border border-blue-soft/10">
                            <Clock className="w-3.5 h-3.5 text-blue-soft" />
                            <span className="text-xs text-blue-soft font-medium">Reading for {daysBetween(book.startDate, new Date().toISOString().split('T')[0])} days</span>
                          </div>
                        )}

                        {/* Pages */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-text-muted w-20">Pages:</label>
                          <input type="number" className="input w-20 text-xs" value={book.pagesRead} min={0} max={book.totalPages}
                            onChange={e => handleProgress(book, parseInt(e.target.value) || 0)} />
                          <span className="text-xs text-text-muted">/ {book.totalPages}</span>
                          {book.totalPages > 0 && (
                            <div className="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                              <motion.div className={`h-full rounded-full ${progress >= 100 ? 'bg-green-soft' : 'bg-accent'}`}
                                animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                            </div>
                          )}
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-text-muted w-20">Rating:</label>
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <button key={i} onClick={() => updateBook(book._id, { rating: book.rating === i + 1 ? 0 : i + 1 }).catch(() => toast.error('Failed to update'))} className="p-0.5">
                                <Star className={`w-4 h-4 transition-colors ${i < book.rating ? 'text-accent fill-accent' : 'text-text-muted/30 hover:text-accent/50'}`} />
                              </button>
                            ))}
                          </div>
                          {book.rating > 0 && <span className="text-[11px] text-text-muted">{book.rating}/5</span>}
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-text-muted w-20">Status:</label>
                          <select className="input text-xs flex-1" value={book.status}
                            onChange={e => handleStatusChange(book, e.target.value as BookData['status'])}>
                            <option value="want-to-read">Want to Read</option>
                            <option value="reading">Reading</option>
                            <option value="completed">Completed</option>
                            <option value="dropped">Dropped</option>
                          </select>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="text-[10px] text-text-muted uppercase tracking-wider block mb-1">Notes</label>
                          <textarea className="input w-full text-xs resize-none" rows={2} placeholder="Your thoughts on this book..."
                            value={book.notes || ''} onChange={e => updateBook(book._id, { notes: e.target.value }).catch(() => toast.error('Failed to update'))} />
                        </div>

                        <button onClick={() => setPendingDelete(book._id)}
                          className="text-xs text-red-soft hover:bg-red-soft/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Remove Book
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
