const fs = require('fs');
const content = `'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useNotesStore, type NoteData } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Search, Pin, Folder, Tag, ChevronLeft,
  MoreHorizontal, PinOff, Clock, Hash, Check, Loader2, FileText
} from 'lucide-react'

/* ── helpers ──────────────────────────────────────── */
function relativeDate(d: string) {
  const now = new Date(), date = new Date(d)
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return \`\${mins}m ago\`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return \`\${hrs}h ago\`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return \`\${days}d ago\`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fullDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function firstLine(content: string) {
  const line = content.replace(/\\\\n/g, '\\n').split('\\n').find(l => l.trim() && !l.startsWith('##') && !l.startsWith('**'))
  return line?.replace(/^[-\\u2022]\\s*/, '').slice(0, 100) || 'No additional text'
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\\s+/).length : 0
}

/* ── Note List Item ─────────────────────────────── */
function NoteListItem({ note, isActive, onSelect, onMenu, menuOpen, onTogglePin, onDelete }: {
  note: NoteData; isActive: boolean; onSelect: () => void; onMenu: () => void;
  menuOpen: boolean; onTogglePin: () => void; onDelete: () => void;
}) {
  return (
    <div className="relative group">
      <button onClick={onSelect}
        className={\`w-full text-left px-4 py-3.5 transition-colors relative \${
          isActive ? 'bg-accent/[0.08]' : 'hover:bg-white/[0.03] active:bg-white/[0.05]'
        }\`}>
        {isActive && (
          <motion.div layoutId="note-active-bar"
            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-accent"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
        )}
        <div className="flex items-center gap-1.5 mb-1">
          {note.pinned && <Pin className="w-3 h-3 text-accent shrink-0" />}
          <span className={\`text-[13px] font-semibold truncate \${isActive ? 'text-accent' : 'text-text-primary'}\`}>
            {note.title || 'Untitled'}
          </span>
        </div>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[11px] text-text-muted shrink-0 tabular-nums">{relativeDate(note.updatedAt)}</span>
          <span className="text-[11px] text-text-muted/50 truncate">{firstLine(note.content)}</span>
        </div>
        {note.tags.length > 0 && (
          <div className="flex gap-1 mt-1.5">
            {note.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[9px] text-accent/60 bg-accent/[0.06] rounded-full px-2 py-0.5 font-medium">{tag}</span>
            ))}
            {note.tags.length > 3 && <span className="text-[9px] text-text-muted">+{note.tags.length - 3}</span>}
          </div>
        )}
      </button>

      {/* Three-dot menu */}
      <button onClick={(e) => { e.stopPropagation(); onMenu() }}
        className="absolute right-2 top-3.5 w-6 h-6 rounded-md flex items-center justify-center
          opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] text-text-muted transition-opacity">
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-2 top-11 z-50 w-40 rounded-xl border border-white/[0.08] overflow-hidden shadow-2xl"
            style={{ background: 'rgba(28,28,30,0.96)', backdropFilter: 'blur(24px)' }}>
            <button onClick={onTogglePin}
              className="w-full text-left px-3.5 py-2.5 text-xs text-text-secondary hover:bg-white/[0.06] flex items-center gap-2.5 transition-colors">
              {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              {note.pinned ? 'Unpin' : 'Pin to Top'}
            </button>
            <div className="h-px bg-white/[0.06] mx-2" />
            <button onClick={onDelete}
              className="w-full text-left px-3.5 py-2.5 text-xs text-red-soft hover:bg-red-soft/10 flex items-center gap-2.5 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete Note
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Main Component ─────────────────────────────── */
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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchNotes().catch(() => {}) }, [fetchNotes])

  /* ── keyboard shortcuts ──────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); createNote() }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderFilter])

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

  const pinnedNotes = useMemo(() => filtered.filter(n => n.pinned), [filtered])
  const unpinnedNotes = useMemo(() => filtered.filter(n => !n.pinned), [filtered])
  const activeNote = useMemo(() => notes.find(n => n._id === activeId) || null, [notes, activeId])

  /* ── auto-save with debounce ──────────────────── */
  const triggerSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(async () => {
      if (!editTitle.trim() && !editContent.trim()) { setSaveStatus('idle'); return }
      await saveNote({
        _id: activeId || undefined,
        title: editTitle || 'Untitled',
        content: editContent,
        folder: editFolder,
        tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
        pinned: editPinned,
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
    }, 600)
  }, [activeId, editTitle, editContent, editFolder, editTags, editPinned, saveNote])

  /* ── select a note ────────────────────────────── */
  const selectNote = (note: NoteData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('idle')
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
    await saveNote({
      title: '',
      content: '',
      folder: folderFilter === 'all' ? 'General' : folderFilter,
      tags: [],
      pinned: false,
    })
    setTimeout(() => {
      const newest = useNotesStore.getState().notes[0]
      if (newest) {
        selectNote(newest)
        setTimeout(() => titleRef.current?.focus(), 50)
      }
    }, 100)
  }

  const handleDelete = async (id: string) => {
    await deleteNote(id)
    setMenuOpen(null)
    if (activeId === id) { setActiveId(null); setShowMobileEditor(false) }
  }

  const togglePin = async (note: NoteData) => {
    await saveNote({ _id: note._id, pinned: !note.pinned })
    if (activeId === note._id) setEditPinned(!note.pinned)
    setMenuOpen(null)
  }

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

  /* ── Mobile: slide between list and editor ────── */
  const mobileSlide = {
    list: { x: showMobileEditor ? '-100%' : '0%' },
    editor: { x: showMobileEditor ? '0%' : '100%' },
  }

  return (
    <div className="h-full flex overflow-hidden relative">

      {/* ══════════════════════════════════════════════ */}
      {/*  LEFT PANEL — Notes List                       */}
      {/* ══════════════════════════════════════════════ */}
      <motion.div
        className="absolute inset-0 md:relative md:w-[300px] lg:w-[340px] xl:w-[360px] shrink-0 flex flex-col border-r border-border z-10 md:z-auto"
        style={{ background: 'rgba(255,255,255,0.015)' }}
        animate={window.innerWidth < 768 ? mobileSlide.list : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-text-primary">Notes</h1>
              <p className="text-[10px] text-text-muted mt-0.5">
                {filtered.length} note{filtered.length !== 1 ? 's' : ''}
                {folderFilter !== 'all' && <span> in {folderFilter}</span>}
              </p>
            </div>
            <button onClick={createNote} title="New Note"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent/10 hover:bg-accent/20 text-accent transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-lg px-3 py-[7px] pl-9 text-xs bg-white/[0.04] border border-white/[0.06] text-text-primary placeholder:text-text-muted outline-none focus:border-accent/30 focus:bg-white/[0.06] transition-colors" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/[0.1] flex items-center justify-center text-text-muted hover:text-text-secondary text-[10px]">
                \u2715
              </button>
            )}
          </div>
        </div>

        {/* Folder pills */}
        <div className="flex gap-1 px-4 py-2 overflow-x-auto no-scrollbar shrink-0">
          {folders.map(f => (
            <button key={f} onClick={() => setFolderFilter(f)}
              className={\`px-2.5 py-1 text-[10px] rounded-md whitespace-nowrap transition-colors flex items-center gap-1 font-medium \${
                folderFilter === f ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.04]'
              }\`}>
              <Folder className="w-2.5 h-2.5" />
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>

        <div className="h-px bg-border shrink-0" />

        {/* Scrollable note list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 px-8">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-border flex items-center justify-center">
                <Search className="w-5 h-5 text-text-muted/30" />
              </div>
              <p className="text-xs text-text-muted text-center">
                {search ? \`No notes matching "\${search}"\` : 'No notes yet'}
              </p>
              {!search && (
                <button onClick={createNote} className="text-[11px] text-accent font-medium hover:underline">Create your first note</button>
              )}
            </div>
          ) : (
            <div>
              {/* Pinned section */}
              {pinnedNotes.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1.5 flex items-center gap-1.5">
                    <Pin className="w-2.5 h-2.5 text-accent/60" />
                    <span className="text-[10px] font-semibold text-accent/60 uppercase tracking-wider">Pinned</span>
                  </div>
                  {pinnedNotes.map(note => (
                    <NoteListItem key={note._id} note={note} isActive={note._id === activeId}
                      onSelect={() => selectNote(note)}
                      onMenu={() => setMenuOpen(menuOpen === note._id ? null : note._id)}
                      menuOpen={menuOpen === note._id}
                      onTogglePin={() => togglePin(note)}
                      onDelete={() => handleDelete(note._id)} />
                  ))}
                </>
              )}

              {/* Recent section */}
              {unpinnedNotes.length > 0 && (
                <>
                  {pinnedNotes.length > 0 && (
                    <div className="px-4 pt-3 pb-1.5 flex items-center gap-1.5">
                      <Clock className="w-2.5 h-2.5 text-text-muted/50" />
                      <span className="text-[10px] font-semibold text-text-muted/50 uppercase tracking-wider">Recent</span>
                    </div>
                  )}
                  {unpinnedNotes.map(note => (
                    <NoteListItem key={note._id} note={note} isActive={note._id === activeId}
                      onSelect={() => selectNote(note)}
                      onMenu={() => setMenuOpen(menuOpen === note._id ? null : note._id)}
                      menuOpen={menuOpen === note._id}
                      onTogglePin={() => togglePin(note)}
                      onDelete={() => handleDelete(note._id)} />
                  ))}
                </>
              )}

              <div className="h-24 md:h-4" />
            </div>
          )}
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════ */}
      {/*  RIGHT PANEL — Editor                          */}
      {/* ══════════════════════════════════════════════ */}
      <motion.div
        className="absolute inset-0 md:relative md:inset-auto flex-1 flex flex-col min-w-0 z-20 md:z-auto bg-bg md:bg-transparent"
        animate={window.innerWidth < 768 ? mobileSlide.editor : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      >
        {activeId ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 sm:px-5 py-2.5 border-b border-border shrink-0" style={{ background: 'rgba(255,255,255,0.01)' }}>
              {/* Mobile back */}
              <button onClick={() => setShowMobileEditor(false)}
                className="md:hidden p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted transition-colors mr-1">
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Folder */}
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <Folder className="w-3 h-3 shrink-0" />
                <input type="text" value={editFolder} onChange={e => onFolderChange(e.target.value)}
                  className="bg-transparent outline-none w-16 sm:w-20 text-text-secondary placeholder:text-text-muted font-medium" placeholder="Folder" />
              </div>
              <div className="w-px h-3.5 bg-border" />

              {/* Tags */}
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted flex-1 min-w-0">
                <Hash className="w-3 h-3 shrink-0" />
                <input type="text" value={editTags} onChange={e => onTagsChange(e.target.value)}
                  className="bg-transparent outline-none flex-1 min-w-0 text-text-secondary placeholder:text-text-muted font-medium" placeholder="Add tags..." />
              </div>

              {/* Save status */}
              <AnimatePresence mode="wait">
                {saveStatus !== 'idle' && (
                  <motion.div key={saveStatus} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-1 text-[10px] text-text-muted mr-1">
                    {saveStatus === 'saving' ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /><span className="hidden sm:inline">Saving</span></>
                    ) : (
                      <><Check className="w-3 h-3 text-green-soft" /><span className="hidden sm:inline text-green-soft">Saved</span></>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pin */}
              <button onClick={onPinToggle} title={editPinned ? 'Unpin' : 'Pin'}
                className={\`p-1.5 rounded-lg transition-colors \${editPinned ? 'text-accent bg-accent/10' : 'text-text-muted hover:bg-white/[0.06]'}\`}>
                <Pin className="w-3.5 h-3.5" />
              </button>

              {/* Delete */}
              <button onClick={() => handleDelete(activeId)} title="Delete"
                className="p-1.5 rounded-lg text-text-muted hover:text-red-soft hover:bg-red-soft/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Editor body — fills all available space */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="w-full max-w-none px-5 sm:px-8 md:px-12 lg:px-20 xl:px-28 py-6 sm:py-8">
                {/* Title */}
                <textarea ref={titleRef} value={editTitle} onChange={e => onTitleChange(e.target.value)}
                  placeholder="Title"
                  rows={1}
                  className="w-full text-2xl sm:text-3xl lg:text-[34px] font-bold text-text-primary bg-transparent resize-none outline-none placeholder:text-text-muted/30 leading-[1.15] tracking-tight mb-2"
                  style={{ overflow: 'hidden' }} />

                {/* Meta line */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted/60 mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-border/50">
                  <span>{activeNote ? fullDate(activeNote.updatedAt) : 'Now'}</span>
                  <span className="hidden sm:inline">&middot;</span>
                  <span className="hidden sm:inline">{wordCount(editContent)} words</span>
                  <span className="hidden sm:inline">&middot;</span>
                  <span className="hidden sm:inline">{editContent.length} chars</span>
                </div>

                {/* Content — full width, comfortable reading */}
                <textarea ref={contentRef}
                  value={editContent} onChange={e => onContentChange(e.target.value)}
                  placeholder="Start writing..."
                  className="w-full min-h-[50vh] sm:min-h-[60vh] text-[15px] sm:text-base leading-[1.85] text-text-primary/85 bg-transparent resize-none outline-none placeholder:text-text-muted/25 selection:bg-accent/20" />
              </div>
            </div>
          </>
        ) : (
          /* ── Empty state ──────────────────────────── */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
            <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-border/50 flex items-center justify-center">
              <FileText className="w-8 h-8 text-text-muted/20" />
            </div>
            <div className="text-center">
              <p className="text-sm text-text-muted font-medium">No note selected</p>
              <p className="text-xs text-text-muted/50 mt-1">Select a note or create a new one</p>
            </div>
            <button onClick={createNote}
              className="mt-2 px-4 py-2 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/15 transition-colors">
              New Note
            </button>
          </div>
        )}
      </motion.div>

      {/* Click-away for menus */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />}
    </div>
  )
}
`;

fs.writeFileSync('src/features/notes/NotesView.tsx', content);
console.log('Done! ' + content.split('\\n').length + ' lines written');
