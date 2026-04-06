'use client'

import { useEffect, useState, useMemo } from 'react'
import { useBookmarkStore, type BookmarkData } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { LinkIcon, Plus, Trash2, FolderOpen, ExternalLink, Search, X, Pencil, Check, Tag } from 'lucide-react'
import { ListSkeleton } from '@/components/Skeletons'
import { toast } from '@/components/Toast'

export function BookmarksView() {
  const { bookmarks, isLoading, fetchBookmarks, addBookmark, updateBookmark, deleteBookmark } = useBookmarkStore()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [activeFolder, setActiveFolder] = useState('All')
  const [form, setForm] = useState({ url: '', title: '', description: '', folder: 'Unsorted', tags: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ url: '', title: '', description: '', folder: '', tags: '' })
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  useEffect(() => { fetchBookmarks().catch(() => toast.error('Failed to load bookmarks')) }, [fetchBookmarks])

  useEffect(() => {
    if (!pendingDelete) return
    const t = setTimeout(() => {
      deleteBookmark(pendingDelete).catch(() => toast.error('Failed to delete'))
      setPendingDelete(null)
    }, 3000)
    return () => clearTimeout(t)
  }, [pendingDelete, deleteBookmark])

  const folders = useMemo(() => {
    const set = new Set(bookmarks.map(b => b.folder))
    return ['All', ...Array.from(set)]
  }, [bookmarks])

  const filtered = useMemo(() => {
    let list = bookmarks
    if (pendingDelete) list = list.filter(b => b._id !== pendingDelete)
    if (activeFolder !== 'All') list = list.filter(b => b.folder === activeFolder)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return list
  }, [bookmarks, activeFolder, search, pendingDelete])

  const handleAdd = async () => {
    if (!form.url || !form.title) return
    await addBookmark({
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    }).catch(() => toast.error('Failed to add bookmark'))
    setForm({ url: '', title: '', description: '', folder: 'Unsorted', tags: '' })
    setShowForm(false)
    toast.success('Bookmark saved')
  }

  const startEdit = (bm: BookmarkData) => {
    setEditingId(bm._id)
    setEditForm({ url: bm.url, title: bm.title, description: bm.description, folder: bm.folder, tags: bm.tags.join(', ') })
  }

  const saveEdit = async () => {
    if (!editingId || !editForm.url || !editForm.title) return
    await updateBookmark(editingId, {
      ...editForm,
      tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
    } as Partial<BookmarkData>).catch(() => toast.error('Failed to update'))
    setEditingId(null)
    toast.success('Bookmark updated')
  }

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() }
    if (e.key === 'Escape') setShowForm(false)
  }

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
    if (e.key === 'Escape') setEditingId(null)
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
        <button onClick={() => setShowForm(!showForm)} className="btn flex items-center gap-1.5">
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : 'Add'}
        </button>
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
            <div className="card space-y-3 border border-accent/20" onKeyDown={handleFormKeyDown}>
              <input className="input w-full" placeholder="URL" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} autoFocus />
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                <input className="input" placeholder="Folder" value={form.folder} onChange={e => setForm(f => ({ ...f, folder: e.target.value }))} />
              </div>
              <input className="input w-full" placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <input className="input w-full" placeholder="Tags (comma-separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
              <button onClick={handleAdd} disabled={!form.url || !form.title} className="btn w-full disabled:opacity-40 disabled:cursor-not-allowed">Save Bookmark</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Folder Tabs */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
        <FolderOpen className="w-3.5 h-3.5 text-text-muted shrink-0" />
        {folders.map(f => (
          <button key={f} onClick={() => setActiveFolder(f)} className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-colors ${activeFolder === f ? 'bg-accent/15 text-accent font-medium' : 'bg-bg-elevated text-text-muted hover:text-text-primary'}`}>{f}</button>
        ))}
      </div>

      {/* Undo bar */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-red-soft/10 border border-red-soft/20">
              <span className="text-xs text-red-soft">Bookmark will be deleted</span>
              <button onClick={() => setPendingDelete(null)} className="text-xs font-semibold text-accent hover:underline">Undo</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bookmarks Grid */}
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 card">
          <LinkIcon className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
          <p className="text-sm text-text-muted">{search ? 'No bookmarks match your search' : 'No bookmarks yet'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {filtered.map((bm, i) => (
            <motion.div key={bm._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="card group">
              {editingId === bm._id ? (
                /* Edit mode */
                <div className="space-y-2" onKeyDown={handleEditKeyDown}>
                  <input className="input w-full text-xs" placeholder="URL" value={editForm.url} onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))} autoFocus />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input text-xs" placeholder="Title" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
                    <input className="input text-xs" placeholder="Folder" value={editForm.folder} onChange={e => setEditForm(f => ({ ...f, folder: e.target.value }))} />
                  </div>
                  <input className="input w-full text-xs" placeholder="Description" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                  <input className="input w-full text-xs" placeholder="Tags (comma-separated)" value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} />
                  <div className="flex items-center gap-2 pt-1">
                    <button onClick={saveEdit} className="btn text-xs flex items-center gap-1 flex-1"><Check className="w-3 h-3" /> Save</button>
                    <button onClick={() => setEditingId(null)} className="btn-ghost text-xs px-3 py-1.5">Cancel</button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-bg-elevated rounded-lg flex items-center justify-center shrink-0">
                    <LinkIcon size={14} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a href={bm.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-text-primary hover:text-accent transition-colors flex items-center gap-1 truncate">
                      {bm.title} <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                    {bm.description && <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{bm.description}</p>}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[11px] bg-bg-elevated px-1.5 py-0.5 rounded text-text-muted flex items-center gap-0.5">
                        <FolderOpen className="w-2.5 h-2.5" />{bm.folder}
                      </span>
                      {bm.tags.map(t => (
                        <span key={t} className="text-[11px] bg-accent/10 text-accent px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Tag className="w-2 h-2" />{t}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(bm)} className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors" title="Edit">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button onClick={() => setPendingDelete(bm._id)} className="p-1.5 rounded-lg text-text-muted hover:text-red-soft hover:bg-red-soft/10 transition-colors" title="Delete">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
