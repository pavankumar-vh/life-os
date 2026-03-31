'use client'

import { useEffect, useState, useMemo } from 'react'
import { useBookStore, type BookData } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Plus, Trash2, Star, ChevronDown, BookMarked, CheckCircle, ClipboardList, XCircle } from 'lucide-react'
import { ListSkeleton } from '@/components/Skeletons'
import { toast } from '@/components/Toast'

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'reading', label: 'Reading' },
  { id: 'completed', label: 'Completed' },
  { id: 'want-to-read', label: 'Want to Read' },
  { id: 'dropped', label: 'Dropped' },
]

export function ReadingListView() {
  const { books, isLoading, fetchBooks, addBook, updateBook, deleteBook } = useBookStore()
  const [showForm, setShowForm] = useState(false)
  const [tab, setTab] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', author: '', totalPages: '', status: 'want-to-read' as BookData['status'] })

  useEffect(() => { fetchBooks().catch(() => toast.error('Failed to load books')) }, [fetchBooks])

  const filtered = useMemo(() => {
    if (tab === 'all') return books
    return books.filter(b => b.status === tab)
  }, [books, tab])

  const stats = useMemo(() => ({
    total: books.length,
    reading: books.filter(b => b.status === 'reading').length,
    completed: books.filter(b => b.status === 'completed').length,
    totalPages: books.filter(b => b.status === 'completed').reduce((s, b) => s + b.totalPages, 0),
  }), [books])

  const handleAdd = async () => {
    if (!form.title || !form.author) return
    await addBook({ ...form, totalPages: parseInt(form.totalPages) || 0, pagesRead: 0, rating: 0, notes: '', startDate: null, finishDate: null }).catch(() => toast.error('Failed to add book'))
    setForm({ title: '', author: '', totalPages: '', status: 'want-to-read' })
    setShowForm(false)
  }

  const handleProgress = async (book: BookData, pages: number) => {
    const pagesRead = Math.min(pages, book.totalPages)
    const updates: Partial<BookData> = { pagesRead }
    if (pagesRead >= book.totalPages && book.totalPages > 0) {
      updates.status = 'completed'
      updates.finishDate = new Date().toISOString().split('T')[0]
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
        <button onClick={() => setShowForm(!showForm)} className="btn flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Book</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
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
          <p className="text-2xl font-bold text-purple-soft">{stats.totalPages.toLocaleString()}</p>
          <p className="text-[11px] text-text-secondary">Pages</p>
        </div>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
            <div className="card space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="Book title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <input className="input" placeholder="Author" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" className="input" placeholder="Total pages" value={form.totalPages} onChange={e => setForm(f => ({ ...f, totalPages: e.target.value }))} />
                <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as BookData['status'] }))}>
                  <option value="want-to-read">Want to Read</option>
                  <option value="reading">Reading</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <button onClick={handleAdd} className="btn w-full">Add Book</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-1.5 rounded-lg text-[11px] whitespace-nowrap transition-colors ${tab === t.id ? 'bg-accent/15 text-accent' : 'bg-bg-elevated text-text-muted hover:text-text-primary'}`}>{t.label}</button>
        ))}
      </div>

      {/* Books */}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.map(book => {
              const progress = book.totalPages > 0 ? Math.round((book.pagesRead / book.totalPages) * 100) : 0
              const isExpanded = expandedId === book._id
              return (
                <motion.div key={book._id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="card">
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : book._id)}>
                    <div className="w-10 h-14 bg-bg-elevated rounded flex items-center justify-center shrink-0"><BookOpen size={18} className="text-accent" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{book.title}</p>
                      <p className="text-xs text-text-muted">{book.author}</p>
                      {book.totalPages > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-20 h-1 bg-bg-elevated rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${progress >= 100 ? 'bg-green-soft' : 'bg-accent'}`} style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[11px] text-text-secondary">{progress}%</span>
                        </div>
                      )}
                    </div>
                    {book.rating > 0 && (
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3 h-3 ${i < book.rating ? 'text-accent fill-accent' : 'text-text-muted'}`} />
                        ))}
                      </div>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="pt-3 mt-3 border-t border-border space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-text-muted w-20">Pages read:</label>
                            <input type="number" className="input w-20 text-xs" value={book.pagesRead} onChange={e => handleProgress(book, parseInt(e.target.value) || 0)} />
                            <span className="text-xs text-text-muted">/ {book.totalPages}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-text-muted w-20">Rating:</label>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <button key={i} onClick={() => updateBook(book._id, { rating: i + 1 }).catch(() => toast.error('Failed to update rating'))} className="p-0.5">
                                  <Star className={`w-4 h-4 ${i < book.rating ? 'text-accent fill-accent' : 'text-text-muted'}`} />
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-text-muted w-20">Status:</label>
                            <select className="input text-xs flex-1" value={book.status} onChange={e => updateBook(book._id, { status: e.target.value as BookData['status'] }).catch(() => toast.error('Failed to update status'))}>
                              <option value="want-to-read">Want to Read</option>
                              <option value="reading">Reading</option>
                              <option value="completed">Completed</option>
                              <option value="dropped">Dropped</option>
                            </select>
                          </div>
                          <button onClick={() => { if (confirm('Remove this book?')) deleteBook(book._id).catch(() => toast.error('Failed to delete book')) }} className="btn-danger text-xs flex items-center gap-1 mt-2"><Trash2 className="w-3 h-3" /> Remove</button>
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
