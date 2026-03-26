'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useNotesStore, type NoteData } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Search, Pin, Folder, Tag, ChevronLeft, MoreHorizontal, PinOff } from 'lucide-react'

/* ── helpers ──────────────────────────────────────── */
function relativeDate(d: string) {
  const now = new Date(), date = new Date(d)
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function firstLine(content: string) {
  const line = content.replace(/\\n/g, '\n').split('\n').find(l => l.trim() && !l.startsWith('##') && !l.startsWith('**'))
  return line?.replace(/^[-•]\s*/, '').slice(0, 80) || ''
}

export function NotesView() {
  const { notes, isLoading, fetchNotes, saveNote, deleteNote } = useNotesStore()
  const [search, setSearch] = useState('')
  const [folderFilter, setFolderFilter] = useState('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editFolder, setEditFolder] = useState('General')
  const [editTags, setEditTags] = useState('')
  const [editPinned, setEditPinned] = useState(false)
  const [showMobileEditor, setShowMobileEditor] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { fetchNotes().catch(() => {}) }, [fetchNotes])

  const folders = useMemo(() => ['all', ...new Set(notes.map(n => n.folder))], [notes])

  const filtered = useMemo(() =>
    notes
      .filter(n => folderFilter === 'all' || n.folder === folderFilter)
      .filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }),
    [notes, folderFilter, search]
  )

  const activeNote = useMemo(() => notes.find(n => n._id === activeId) || null, [notes, activeId])

  /* ── auto-save with debounce ──────────────────── */
  const triggerSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!editTitle.trim() && !editContent.trim()) return
      await saveNote({
        _id: activeId || undefined,
        title: editTitle || 'Untitled',
        content: editContent,
        folder: editFolder,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
        pinned: editPinned,
      })
    }, 800)
  }, [activeId, editTitle, editContent, editFolder, editTags, editPinned, saveNote])

  /* ── select a note ────────────────────────────── */
  const selectNote = (note: NoteData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setActiveId(note._id)
    setEditTitle(note.title)
    setEditContent(note.content)
    setEditFolder(note.folder)
    setEditTags(note.tags.join(', '))
    setEditPinned(note.pinned)
    setShowMobileEditor(true)
  }

  /* ── new note ─────────────────────────────────── */
  const createNote = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    const result = await saveNote({
      title: 'Untitled',
      content: '',
      folder: folderFilter === 'all' ? 'General' : folderFilter,
      tags: [],
      pinned: false,
    })
    // Select the newest note after creation
    setTimeout(() => {
      const newest = useNotesStore.getState().notes[0]
      if (newest) selectNote(newest)
    }, 100)
  }

  const handleDelete = async (id: string) => {
    await deleteNote(id)
    setMenuOpen(null)
    if (activeId === id) {
      setActiveId(null)
      setShowMobileEditor(false)
    }
  }

  const togglePin = async (note: NoteData) => {
    await saveNote({ _id: note._id, pinned: !note.pinned })
    if (activeId === note._id) setEditPinned(!note.pinned)
    setMenuOpen(null)
  }

  /* ── field change handlers (auto-save) ────────── */
  const onTitleChange = (v: string) => { setEditTitle(v); triggerSave() }
  const onContentChange = (v: string) => { setEditContent(v); triggerSave() }
  const onFolderChange = (v: string) => { setEditFolder(v); triggerSave() }
  const onTagsChange = (v: string) => { setEditTags(v); triggerSave() }
  const onPinToggle = () => { setEditPinned(p => !p); setTimeout(triggerSave, 0) }

  /* ── auto-resize title textarea ───────────────── */
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = '0'
      titleRef.current.style.height = titleRef.current.scrollHeight + 'px'
    }
  }, [editTitle])

  /* ──────────────────────────────────────────────── */
  /*  RENDER                                           */
  /* ──────────────────────────────────────────────── */
  return (
    <div className="flex h-[calc(100vh-6rem)] -m-6 md:-m-8">

      {/* ── LEFT: Notes List Panel ─────────────────── */}
      <div className={`w-full md:w-[340px] lg:w-[360px] shrink-0 flex flex-col border-r border-border
        ${showMobileEditor ? 'hidden md:flex' : 'flex'}`}
        style={{ background: 'rgba(255,255,255,0.02)' }}>

        {/* List header */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-text-primary">Notes</h1>
              <p className="text-[11px] text-text-muted">{filtered.length} note{filtered.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={createNote}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent/10 hover:bg-accent/20 text-accent transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search"
              className="w-full rounded-lg px-3 py-2 pl-9 text-xs
                bg-white/[0.04] border border-white/[0.06] text-text-primary
                placeholder:text-text-muted outline-none
                focus:border-accent/30 focus:bg-white/[0.06] transition-colors" />
          </div>
        </div>

        {/* Folder pills */}
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto no-scrollbar">
          {folders.map(f => (
            <button key={f} onClick={() => setFolderFilter(f)}
              className={`px-2.5 py-1 text-[11px] rounded-md whitespace-nowrap transition-colors flex items-center gap-1 ${
                folderFilter === f
                  ? 'bg-accent/15 text-accent font-medium'
                  : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.04]'
              }`}>
              <Folder className="w-3 h-3" />
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-border mx-4" />

        {/* Scrollable note list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-xs text-text-muted animate-pulse">Loading...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-xs text-text-muted">No notes</p>
              <button onClick={createNote} className="text-[11px] text-accent hover:underline">Create one</button>
            </div>
          ) : (
            <div className="py-1">
              {filtered.map(note => {
                const isActive = note._id === activeId
                return (
                  <div key={note._id} className="relative group">
                    <button
                      onClick={() => selectNote(note)}
                      className={`w-full text-left px-4 py-3 transition-colors relative ${
                        isActive
                          ? 'bg-accent/10'
                          : 'hover:bg-white/[0.03]'
                      }`}>
                      {/* Active indicator bar */}
                      {isActive && (
                        <motion.div layoutId="note-active-bar"
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-accent"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
                      )}
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {note.pinned && <Pin className="w-3 h-3 text-accent shrink-0" />}
                        <span className={`text-[13px] font-medium truncate ${
                          isActive ? 'text-accent' : 'text-text-primary'
                        }`}>
                          {note.title || 'Untitled'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[11px] text-text-muted shrink-0">{relativeDate(note.updatedAt)}</span>
                        <span className="text-[11px] text-text-muted/60 truncate">{firstLine(note.content)}</span>
                      </div>
                      {note.tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {note.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[9px] text-text-muted/80 bg-white/[0.04] rounded px-1.5 py-0.5">{tag}</span>
                          ))}
                        </div>
                      )}
                    </button>

                    {/* Context menu trigger */}
                    <button onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === note._id ? null : note._id) }}
                      className="absolute right-2 top-3 w-6 h-6 rounded-md flex items-center justify-center
                        opacity-0 group-hover:opacity-100 hover:bg-white/[0.06] text-text-muted transition-all">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>

                    {/* Context menu */}
                    <AnimatePresence>
                      {menuOpen === note._id && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.12 }}
                          className="absolute right-2 top-10 z-50 w-36 rounded-lg border border-border overflow-hidden"
                          style={{ background: 'rgba(30,30,30,0.95)', backdropFilter: 'blur(20px)' }}>
                          <button onClick={() => togglePin(note)}
                            className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-white/[0.06] flex items-center gap-2 transition-colors">
                            {note.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                            {note.pinned ? 'Unpin' : 'Pin to top'}
                          </button>
                          <button onClick={() => handleDelete(note._id)}
                            className="w-full text-left px-3 py-2 text-xs text-red-soft hover:bg-red-soft/10 flex items-center gap-2 transition-colors">
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Editor Panel ────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0
        ${!showMobileEditor ? 'hidden md:flex' : 'flex'}`}>

        {activeId ? (
          <>
            {/* Editor toolbar */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
              {/* Mobile back */}
              <button onClick={() => setShowMobileEditor(false)}
                className="md:hidden p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Folder & Tags compact */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-1 text-[11px] text-text-muted">
                  <Folder className="w-3 h-3" />
                  <input type="text" value={editFolder} onChange={e => onFolderChange(e.target.value)}
                    className="bg-transparent outline-none w-20 text-text-secondary placeholder:text-text-muted"
                    placeholder="Folder" />
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1 text-[11px] text-text-muted flex-1 min-w-0">
                  <Tag className="w-3 h-3 shrink-0" />
                  <input type="text" value={editTags} onChange={e => onTagsChange(e.target.value)}
                    className="bg-transparent outline-none flex-1 min-w-0 text-text-secondary placeholder:text-text-muted"
                    placeholder="Tags (comma separated)" />
                </div>
              </div>

              {/* Pin toggle */}
              <button onClick={onPinToggle}
                className={`p-1.5 rounded-lg transition-colors ${
                  editPinned ? 'text-accent bg-accent/10' : 'text-text-muted hover:bg-white/[0.06]'
                }`}>
                <Pin className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Editor body */}
            <div className="flex-1 overflow-y-auto px-6 md:px-10 lg:px-16 py-6">
              {/* Title */}
              <textarea ref={titleRef} value={editTitle} onChange={e => onTitleChange(e.target.value)}
                placeholder="Title"
                rows={1}
                className="w-full text-2xl md:text-3xl font-bold text-text-primary bg-transparent resize-none outline-none
                  placeholder:text-text-muted/40 leading-tight mb-1"
                style={{ overflow: 'hidden' }} />

              {/* Date */}
              <p className="text-[11px] text-text-muted mb-6">
                {activeNote ? new Date(activeNote.updatedAt).toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                }) : 'Now'}
              </p>

              {/* Content */}
              <textarea value={editContent} onChange={e => onContentChange(e.target.value)}
                placeholder="Start writing..."
                className="w-full min-h-[60vh] text-[15px] leading-relaxed text-text-secondary bg-transparent resize-none outline-none
                  placeholder:text-text-muted/30" />
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-border flex items-center justify-center">
              <Pin className="w-6 h-6 text-text-muted/40" />
            </div>
            <p className="text-sm text-text-muted">Select a note or create a new one</p>
            <button onClick={createNote} className="text-xs text-accent hover:underline">New Note</button>
          </div>
        )}
      </div>

      {/* Click-away to close menu */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />}
    </div>
  )
}
