'use client'

import { useEffect, useState, useMemo } from 'react'
import { useBookmarkStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { LinkIcon, Plus, Trash2, FolderOpen, ExternalLink, Search } from 'lucide-react'

export function BookmarksView() {
  const { bookmarks, isLoading, fetchBookmarks, addBookmark, deleteBookmark } = useBookmarkStore()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [activeFolder, setActiveFolder] = useState('All')
  const [form, setForm] = useState({ url: '', title: '', description: '', folder: 'Unsorted', tags: '' })

  useEffect(() => { fetchBookmarks().catch(() => {}) }, [fetchBookmarks])

  const folders = useMemo(() => {
    const set = new Set(bookmarks.map(b => b.folder))
    return ['All', ...Array.from(set)]
  }, [bookmarks])

  const filtered = useMemo(() => {
    let list = bookmarks
    if (activeFolder !== 'All') list = list.filter(b => b.folder === activeFolder)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(b => b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q) || b.tags.some(t => t.toLowerCase().includes(q)))
    }
    return list
  }, [bookmarks, activeFolder, search])

  const handleAdd = async () => {
    if (!form.url || !form.title) return
    await addBookmark({
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    }).catch(() => {})
    setForm({ url: '', title: '', description: '', folder: 'Unsorted', tags: '' })
    setShowForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <LinkIcon className="w-6 h-6 text-accent" /> Bookmarks
          </h1>
          <p className="text-text-muted text-xs mt-0.5">{bookmarks.length} saved links</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add</button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
        <input className="input w-full pl-9" placeholder="Search bookmarks..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-4">
            <div className="card space-y-3">
              <input className="input w-full" placeholder="URL" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <input className="input" placeholder="Folder" value={form.folder} onChange={e => setForm(f => ({ ...f, folder: e.target.value }))} />
              </div>
              <input className="input w-full" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <input className="input w-full" placeholder="Tags (comma-separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
              <button onClick={handleAdd} className="btn w-full">Save Bookmark</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folder Tabs */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
        <FolderOpen className="w-3.5 h-3.5 text-text-muted shrink-0" />
        {folders.map(f => (
          <button key={f} onClick={() => setActiveFolder(f)} className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors ${activeFolder === f ? 'bg-accent/15 text-accent' : 'bg-bg-elevated text-text-muted hover:text-text-primary'}`}>{f}</button>
        ))}
      </div>

      {/* Bookmarks Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-text-muted text-sm">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <AnimatePresence mode="popLayout">
            {filtered.map(bm => (
              <motion.div key={bm._id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="card group">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-bg-elevated rounded-lg flex items-center justify-center shrink-0"><LinkIcon size={14} className="text-accent" /></div>
                  <div className="flex-1 min-w-0">
                    <a href={bm.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-text-primary hover:text-accent transition-colors flex items-center gap-1 truncate">
                      {bm.title} <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                    {bm.description && <p className="text-[10px] text-text-muted mt-0.5 line-clamp-1">{bm.description}</p>}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[9px] bg-bg-elevated px-1.5 py-0.5 rounded text-text-muted">{bm.folder}</span>
                      {bm.tags.map(t => (
                        <span key={t} className="text-[9px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">#{t}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => deleteBookmark(bm._id).catch(() => {})} className="btn-ghost p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
