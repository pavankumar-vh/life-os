'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNotesStore, type NoteData } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Search, Pin, Folder, FolderPlus, ChevronLeft, X, Tag,
  MoreHorizontal, PinOff, Clock, Hash, Check, Loader2, FileText, ImagePlus,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Highlighter,
  List, ListOrdered, ListTodo, Heading1, Heading2, Heading3, Quote, Minus, Braces
} from 'lucide-react'
import { toast } from '@/components/Toast'
import { PhotoUpload } from '@/components/PhotoUpload'

import { useEditor, EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import TiptapUnderline from '@tiptap/extension-underline'
import Image from '@tiptap/extension-image'

function relativeDate(d: string) {
  const now = new Date(), date = new Date(d)
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fullDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function getPreview(html: string) {
  const txt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return txt.slice(0, 100) || 'No additional text'
}

function wordCount(html: string) {
  const txt = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return txt ? txt.split(/\s+/).length : 0
}

function NoteListItem({ note, isActive, onSelect, onMenu, menuOpen, onTogglePin, onDelete }: {
  note: NoteData; isActive: boolean; onSelect: () => void; onMenu: () => void;
  menuOpen: boolean; onTogglePin: () => void; onDelete: () => void;
}) {
  return (
    <div className="relative group">
      <button onClick={onSelect}
        className={`w-full text-left px-4 py-3.5 transition-all relative ${
          isActive ? 'bg-accent/[0.08]' : 'hover:bg-white/[0.03] active:bg-white/[0.05]'
        }`}>
        {isActive && (
          <motion.div layoutId="note-active-bar"
            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-accent"
            transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
        )}
        <div className="flex items-center gap-1.5 mb-1">
          {note.pinned && <Pin className="w-3 h-3 text-accent shrink-0" />}
          <span className={`text-[13px] font-semibold truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>
            {note.title || 'Untitled'}
          </span>
        </div>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-[11px] text-text-secondary shrink-0 tabular-nums">{relativeDate(note.updatedAt)}</span>
          <span className="text-[11px] text-text-secondary truncate">{getPreview(note.content)}</span>
        </div>
        {note.tags.length > 0 && (
          <div className="flex gap-1 mt-1.5">
            {note.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] text-accent/60 bg-accent/[0.06] rounded-full px-2 py-0.5 font-medium">{tag}</span>
            ))}
            {note.tags.length > 3 && <span className="text-[10px] text-text-secondary">+{note.tags.length - 3}</span>}
          </div>
        )}
      </button>
      <button onClick={(e) => { e.stopPropagation(); onMenu() }}
        className="absolute right-2 top-3.5 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] text-text-muted transition-opacity">
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-2 top-11 z-50 w-40 rounded-xl border border-white/[0.08] overflow-hidden shadow-2xl"
            style={{ background: 'rgba(28,28,30,0.96)', backdropFilter: 'blur(16px)' }}>
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

const SLASH_COMMANDS = [
  { label: 'Heading 1', icon: Heading1, command: (e: any) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Heading 2', icon: Heading2, command: (e: any) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Heading 3', icon: Heading3, command: (e: any) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'Bullet List', icon: List, command: (e: any) => e.chain().focus().toggleBulletList().run() },
  { label: 'Numbered List', icon: ListOrdered, command: (e: any) => e.chain().focus().toggleOrderedList().run() },
  { label: 'Task List', icon: ListTodo, command: (e: any) => e.chain().focus().toggleTaskList().run() },
  { label: 'Quote', icon: Quote, command: (e: any) => e.chain().focus().toggleBlockquote().run() },
  { label: 'Code Block', icon: Braces, command: (e: any) => e.chain().focus().toggleCodeBlock().run() },
  { label: 'Divider', icon: Minus, command: (e: any) => e.chain().focus().setHorizontalRule().run() },
]

export function NotesView() {
  const { notes, isLoading, fetchNotes, saveNote, deleteNote } = useNotesStore()
  const [search, setSearch] = useState('')
  const [folderFilter, setFolderFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editFolder, setEditFolder] = useState('General')
  const [editTags, setEditTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [editPinned, setEditPinned] = useState(false)
  const [showMobileEditor, setShowMobileEditor] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [editPhotos, setEditPhotos] = useState<string[]>([])
  const editPhotosRef = useRef<string[]>([])
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const [slashIndex, setSlashIndex] = useState(0)
  const [modal, setModal] = useState<{ type: 'folder' | 'delete' | 'tag'; deleteId?: string } | null>(null)
  const [tagSuggestIdx, setTagSuggestIdx] = useState(0)
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [tagInputActive, setTagInputActive] = useState(false)
  const tagInputRef = useRef<HTMLInputElement>(null)
  const tagContainerRef = useRef<HTMLDivElement>(null)
  const [tagDropdownPos, setTagDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const [modalInput, setModalInput] = useState('')
  const modalInputRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoadingNote = useRef(false)
  const activeIdRef = useRef<string | null>(null)
  const editTitleRef = useRef('')
  const editFolderRef = useRef('General')
  const editTagsRef = useRef<string[]>([])
  const editPinnedRef = useRef(false)

  activeIdRef.current = activeId
  editTitleRef.current = editTitle
  editFolderRef.current = editFolder
  editTagsRef.current = editTags
  editPinnedRef.current = editPinned
  editPhotosRef.current = editPhotos

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  // uploadImageInline is defined after useEditor below
  const uploadImageInlineRef = useRef<(file: File) => Promise<void>>(async () => {})

  useEffect(() => { fetchNotes().catch(() => toast.error('Failed to load notes')) }, [fetchNotes])

  const filteredSlashCmds = useMemo(() =>
    SLASH_COMMANDS.filter(c => c.label.toLowerCase().includes(slashFilter.toLowerCase())),
    [slashFilter]
  )

  const closeSlash = () => { setSlashOpen(false); setSlashFilter(''); setSlashIndex(0) }

  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      codeBlock: { HTMLAttributes: { class: 'tiptap-code-block' } },
    }),
    Placeholder.configure({ placeholder: 'Start writing... (type / for commands, paste or drag images)' }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Highlight.configure({ multicolor: false }),
    Typography,
    TiptapUnderline,
    Image.configure({ inline: false, allowBase64: false }),
  ], [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    editorProps: {
      attributes: { class: 'tiptap-editor outline-none min-h-[50vh]' },
      handlePaste(_view, event) {
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) uploadImageInlineRef.current(file)
            return true
          }
        }
        return false
      },
      handleDrop(_view, event, _slice, moved) {
        if (moved) return false
        const files = event.dataTransfer?.files
        if (!files?.length) return false
        let handled = false
        for (const file of Array.from(files)) {
          if (file.type.startsWith('image/')) {
            event.preventDefault()
            uploadImageInlineRef.current(file)
            handled = true
          }
        }
        return handled
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isLoadingNote.current) return
      const html = ed.getHTML()
      const { state } = ed
      const { from } = state.selection
      const textBefore = state.doc.textBetween(Math.max(0, from - 20), from, '\0', '\0')
      const slashMatch = textBefore.match(/\/(\w*)$/)
      if (slashMatch) {
        setSlashOpen(true)
        setSlashFilter(slashMatch[1])
        setSlashIndex(0)
      } else {
        setSlashOpen(false)
      }
      doSave(html)
    },
  })

  // Define inline image uploader AFTER editor is declared (must reference editor ref)
  const uploadImageInline = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('lifeos-token') : null
    if (!token) { toast.error('Not authenticated'); return }
    const form = new FormData()
    form.append('photo', file)
    form.append('context', 'note')
    if (activeIdRef.current) form.append('refId', activeIdRef.current)
    try {
      const res = await fetch(`${apiBase}/api/uploads/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (!res.ok) { toast.error('Image upload failed'); return }
      const data = await res.json()
      editor?.chain().focus().setImage({ src: data.url, alt: file.name }).run()
    } catch {
      toast.error('Image upload failed')
    }
  }, [editor, apiBase])

  // Keep ref in sync so paste/drop handlers (defined inside useEditor) can call this
  uploadImageInlineRef.current = uploadImageInline

  useEffect(() => {
    if (!editor || !slashOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex(i => (i + 1) % filteredSlashCmds.length) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIndex(i => (i - 1 + filteredSlashCmds.length) % filteredSlashCmds.length) }
      else if (e.key === 'Enter') { e.preventDefault(); runSlashCmd() }
      else if (e.key === 'Escape') { e.preventDefault(); closeSlash() }
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [slashOpen, slashIndex, filteredSlashCmds, editor])

  const runSlashCmd = useCallback((idx?: number) => {
    const i = idx ?? slashIndex
    const cmd = filteredSlashCmds[i]
    if (!cmd || !editor) return
    const { state } = editor
    const { from } = state.selection
    const textBefore = state.doc.textBetween(Math.max(0, from - 20), from, '\0', '\0')
    const slashMatch = textBefore.match(/\/(\w*)$/)
    if (slashMatch) {
      editor.chain().focus().deleteRange({ from: from - slashMatch[0].length, to: from }).run()
    }
    cmd.command(editor)
    closeSlash()
  }, [filteredSlashCmds, editor, slashIndex])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); createNote() }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [folderFilter])

  const folders = useMemo(() => ['all', ...new Set(notes.map(n => n.folder))], [notes])
  const allTags = useMemo(() => [...new Set(notes.flatMap(n => n.tags))].sort(), [notes])
  const allTagsLower = useMemo(() => new Set(allTags.map(t => t.toLowerCase())), [allTags])
  const editTagsLower = useMemo(() => new Set(editTags.map(t => t.toLowerCase())), [editTags])

  const tagSuggestions = useMemo(() => {
    const available = allTags.filter(t => !editTagsLower.has(t.toLowerCase()))
    if (!tagInput.trim()) return available
    const q = tagInput.trim().toLowerCase()
    return available.filter(t => t.toLowerCase().includes(q))
  }, [tagInput, allTags, editTagsLower])

  const filtered = useMemo(() =>
    notes
      .filter(n => folderFilter === 'all' || n.folder === folderFilter)
      .filter(n => !tagFilter || n.tags.includes(tagFilter))
      .filter(n => {
        if (!search) return true
        const s = search.toLowerCase()
        return n.title.toLowerCase().includes(s) || n.content.replace(/<[^>]+>/g, '').toLowerCase().includes(s)
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }),
    [notes, folderFilter, tagFilter, search]
  )

  const modalTagSuggestions = useMemo(() => {
    if (modal?.type !== 'tag') return []
    const q = modalInput.trim().toLowerCase()
    if (!q) return allTags.slice(0, 8)
    return allTags.filter(t => t.toLowerCase().includes(q)).slice(0, 8)
  }, [modal, modalInput, allTags])

  const pinnedNotes = useMemo(() => filtered.filter(n => n.pinned), [filtered])
  const unpinnedNotes = useMemo(() => filtered.filter(n => !n.pinned), [filtered])
  const activeNote = useMemo(() => notes.find(n => n._id === activeId) || null, [notes, activeId])

  const doSave = useCallback((html?: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(async () => {
      const content = html ?? editor?.getHTML() ?? ''
      const title = editTitleRef.current
      const folder = editFolderRef.current
      const tags = editTagsRef.current
      const tagsList = tags
      const pinned = editPinnedRef.current
      const photos = editPhotosRef.current
      const id = activeIdRef.current
      if (!title.trim() && !content.trim()) { setSaveStatus('idle'); return }
      await saveNote({
        _id: id || undefined,
        title: title || 'Untitled',
        content,
        folder,
        tags: tagsList,
        pinned,
        photos,
      }).catch(() => { setSaveStatus('idle'); toast.error('Failed to save note') })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1500)
    }, 600)
  }, [editor, saveNote])

  const selectNote = useCallback((note: NoteData) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('idle')
    setActiveId(note._id)
    setEditTitle(note.title)
    setEditFolder(note.folder)
    setEditTags(note.tags || [])
    setEditPhotos(note.photos || [])
    setTagInput('')
    setEditPinned(note.pinned)
    setShowMobileEditor(true)
    if (editor) {
      isLoadingNote.current = true
      editor.commands.setContent(note.content || '<p></p>')
      setTimeout(() => { isLoadingNote.current = false }, 50)
    }
  }, [editor])

  const createNote = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await saveNote({ title: '', content: '', folder: folderFilter === 'all' ? 'General' : folderFilter, tags: [], pinned: false })
    setTimeout(() => {
      const newest = useNotesStore.getState().notes[0]
      if (newest) { selectNote(newest); setTimeout(() => titleRef.current?.focus(), 50) }
    }, 100)
  }

  const handleDelete = (id: string) => {
    setMenuOpen(null)
    setModal({ type: 'delete', deleteId: id })
  }

  const confirmDelete = async () => {
    const id = modal?.deleteId
    setModal(null)
    if (!id) return
    await deleteNote(id).catch(() => toast.error('Failed to delete note'))
    if (activeId === id) { setActiveId(null); setShowMobileEditor(false); editor?.commands.clearContent() }
  }

  const togglePin = async (note: NoteData) => {
    await saveNote({ _id: note._id, pinned: !note.pinned })
    if (activeId === note._id) setEditPinned(!note.pinned)
    setMenuOpen(null)
  }

  const createFolder = () => {
    setModalInput('')
    setModal({ type: 'folder' })
    setTimeout(() => modalInputRef.current?.focus(), 100)
  }

  const confirmCreateFolder = () => {
    const name = modalInput.trim()
    setModal(null)
    setModalInput('')
    if (!name) return
    saveNote({ title: '', content: '', folder: name, tags: [], pinned: false }).then(() => {
      setFolderFilter(name)
      setTimeout(() => {
        const newest = useNotesStore.getState().notes.find(n => n.folder === name)
        if (newest) { selectNote(newest); setTimeout(() => titleRef.current?.focus(), 50) }
      }, 100)
    })
  }

  const confirmCreateTag = () => {
    const normalized = modalInput.trim().toLowerCase()
    const tag = allTags.find(t => t.toLowerCase() === normalized) ?? normalized
    setModal(null)
    setModalInput('')
    if (!normalized) return
    if (activeId) {
      const updated = editTagsLower.has(normalized) ? editTags : [...editTags, tag]
      setEditTags(updated)
      doSave()
    } else {
      saveNote({ title: '', content: '', folder: folderFilter === 'all' ? 'General' : folderFilter, tags: [tag], pinned: false }).then(() => {
        setTimeout(() => {
          const newest = useNotesStore.getState().notes[0]
          if (newest) { selectNote(newest); setTimeout(() => titleRef.current?.focus(), 50) }
        }, 100)
      })
    }
    setTagFilter(tag)
  }

  const onTitleChange = (v: string) => { setEditTitle(v); doSave() }
  const onFolderChange = (v: string) => { setEditFolder(v); doSave() }
  const activateTagInput = () => {
    setTagInputActive(true)
    setShowTagSuggestions(true)
    setTimeout(() => {
      tagInputRef.current?.focus()
      updateTagDropdownPos()
    }, 30)
  }
  const addTag = (raw: string) => {
    const normalized = raw.trim().toLowerCase()
    const tag = allTags.find(t => t.toLowerCase() === normalized) ?? normalized
    if (!normalized || editTagsLower.has(normalized)) { setTagInput(''); return }
    const updated = [...editTags, tag]
    setEditTags(updated)
    setTagInput('')
    setShowTagSuggestions(false)
    setTagSuggestIdx(0)
    doSave()
  }
  const removeTag = (tag: string) => {
    const updated = editTags.filter(t => t !== tag)
    setEditTags(updated)
    doSave()
  }
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showTagSuggestions && tagSuggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setTagSuggestIdx(i => (i + 1) % tagSuggestions.length); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setTagSuggestIdx(i => (i - 1 + tagSuggestions.length) % tagSuggestions.length); return }
      if (e.key === 'Enter') { e.preventDefault(); addTag(tagSuggestions[tagSuggestIdx]); return }
      if (e.key === 'Escape') { e.preventDefault(); setShowTagSuggestions(false); return }
    }
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      addTag(tagInput)
    }
    if (e.key === 'Backspace' && !tagInput && editTags.length > 0) {
      removeTag(editTags[editTags.length - 1])
    }
  }
  const updateTagDropdownPos = useCallback(() => {
    if (tagContainerRef.current) {
      const rect = tagContainerRef.current.getBoundingClientRect()
      setTagDropdownPos({ top: rect.bottom + 6, left: rect.left })
    }
  }, [])
  const handleTagInputChange = (v: string) => {
    setTagInput(v)
    setShowTagSuggestions(true)
    setTagSuggestIdx(0)
    updateTagDropdownPos()
  }
  const onPinToggle = () => { setEditPinned(p => !p); setTimeout(doSave, 0) }

  useEffect(() => {
    if (titleRef.current) { titleRef.current.style.height = '0'; titleRef.current.style.height = titleRef.current.scrollHeight + 'px' }
  }, [editTitle])

  const ToolBtn = ({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title?: string }) => (
    <button type="button" onClick={onClick} title={title}
      className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${
        active ? 'bg-accent/20 text-accent' : 'text-text-secondary hover:bg-white/[0.08] hover:text-text-primary'
      }`}>{children}</button>
  )

  return (
    <div className="h-full flex overflow-hidden relative">
      {/* LEFT PANEL */}
      <div className={`absolute inset-0 md:relative md:w-[300px] lg:w-[340px] xl:w-[360px] shrink-0 flex flex-col border-r border-border z-10 md:z-auto transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:translate-x-0 ${showMobileEditor ? '-translate-x-full' : 'translate-x-0'}`}
        style={{ background: 'rgba(255,255,255,0.015)' }}>
        <div className="px-4 pt-5 pb-2 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-text-primary">Notes</h1>
              <p className="text-xs text-text-muted mt-0.5">{filtered.length} note{filtered.length !== 1 ? 's' : ''}{folderFilter !== 'all' && <span> in {folderFilter}</span>}</p>
            </div>
            <button onClick={createNote} title="New Note" className="w-8 h-8 rounded-lg flex items-center justify-center bg-accent/10 hover:bg-accent/20 text-accent transition-colors"><Plus className="w-4 h-4" /></button>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..."
              className="w-full rounded-lg px-3 py-[7px] pl-9 text-xs bg-white/[0.04] border border-white/[0.06] text-text-primary placeholder:text-text-muted outline-none focus:border-accent/30 focus:bg-white/[0.06] transition-colors" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white/[0.1] flex items-center justify-center text-text-muted text-xs">\u2715</button>}
          </div>
        </div>
        <div className="flex gap-1 px-4 py-2 overflow-x-auto no-scrollbar shrink-0">
          {folders.map(f => (
            <button key={f} onClick={() => setFolderFilter(f)} className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-colors flex items-center gap-1 font-medium ${folderFilter === f ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-secondary hover:bg-white/[0.04]'}`}>
              <Folder className="w-2.5 h-2.5" />{f === 'all' ? 'All' : f}
            </button>
          ))}
          <button onClick={createFolder} title="New Folder" className="px-2 py-1 text-xs rounded-md whitespace-nowrap transition-colors flex items-center gap-1 font-medium text-text-muted hover:text-accent hover:bg-accent/[0.06] border border-dashed border-white/[0.08] hover:border-accent/30">
            <FolderPlus className="w-2.5 h-2.5" />New
          </button>
        </div>
        {allTags.length > 0 && (
          <div className="flex gap-1 px-4 py-1.5 overflow-x-auto no-scrollbar shrink-0">
            {tagFilter && (
              <button onClick={() => setTagFilter(null)} className="px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 font-medium bg-accent/15 text-accent">
                <X className="w-2.5 h-2.5" />Clear
              </button>
            )}
            {allTags.map(tag => (
              <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                className={`px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 font-medium ${
                  tagFilter === tag ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-secondary bg-white/[0.03] hover:bg-white/[0.06]'
                }`}>
                <Hash className="w-2 h-2" />{tag}
              </button>
            ))}
            <button onClick={() => { setModalInput(''); setModal({ type: 'tag' }); setTimeout(() => modalInputRef.current?.focus(), 100) }}
              title="New Tag" className="px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 font-medium text-text-muted hover:text-accent hover:bg-accent/[0.06] border border-dashed border-white/[0.08] hover:border-accent/30">
              <Tag className="w-2 h-2" />New
            </button>
          </div>
        )}
        {allTags.length === 0 && (
          <div className="flex gap-1 px-4 py-1.5 shrink-0">
            <button onClick={() => { setModalInput(''); setModal({ type: 'tag' }); setTimeout(() => modalInputRef.current?.focus(), 100) }}
              className="px-2 py-0.5 text-[10px] rounded-full whitespace-nowrap transition-colors flex items-center gap-1 font-medium text-text-muted hover:text-accent hover:bg-accent/[0.06] border border-dashed border-white/[0.08] hover:border-accent/30">
              <Tag className="w-2 h-2" />Create Tag
            </button>
          </div>
        )}
        <div className="h-px bg-border shrink-0" />
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {isLoading ? <div className="flex items-center justify-center py-20"><Loader2 className="w-4 h-4 text-text-muted animate-spin" /></div>
          : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 px-8">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-border flex items-center justify-center"><Search className="w-5 h-5 text-text-muted" /></div>
              <p className="text-xs text-text-muted text-center">{search ? `No notes matching "${search}"` : 'No notes yet'}</p>
              {!search && <button onClick={createNote} className="text-[11px] text-accent font-medium hover:underline">Create your first note</button>}
            </div>
          ) : (
            <div>
              {pinnedNotes.length > 0 && (<>
                <div className="px-4 pt-3 pb-1.5 flex items-center gap-1.5"><Pin className="w-2.5 h-2.5 text-accent/60" /><span className="text-[10px] font-semibold text-accent/60 uppercase tracking-wider">Pinned</span></div>
                {pinnedNotes.map(note => <NoteListItem key={note._id} note={note} isActive={note._id === activeId} onSelect={() => selectNote(note)} onMenu={() => setMenuOpen(menuOpen === note._id ? null : note._id)} menuOpen={menuOpen === note._id} onTogglePin={() => togglePin(note)} onDelete={() => handleDelete(note._id)} />)}
              </>)}
              {unpinnedNotes.length > 0 && (<>
                {pinnedNotes.length > 0 && <div className="px-4 pt-3 pb-1.5 flex items-center gap-1.5"><Clock className="w-2.5 h-2.5 text-text-muted" /><span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Recent</span></div>}
                {unpinnedNotes.map(note => <NoteListItem key={note._id} note={note} isActive={note._id === activeId} onSelect={() => selectNote(note)} onMenu={() => setMenuOpen(menuOpen === note._id ? null : note._id)} menuOpen={menuOpen === note._id} onTogglePin={() => togglePin(note)} onDelete={() => handleDelete(note._id)} />)}
              </>)}
              <div className="h-24 md:h-4" />
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className={`absolute inset-0 md:relative md:inset-auto flex-1 flex flex-col min-w-0 z-20 md:z-auto bg-bg md:bg-transparent transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:translate-x-0 ${showMobileEditor ? 'translate-x-0' : 'translate-x-full'}`}>
        {activeId && editor ? (<>
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-3 sm:px-4 py-2 border-b border-border shrink-0 overflow-x-auto no-scrollbar" style={{ background: 'rgba(255,255,255,0.01)', overflowY: 'visible' }}>
            <button onClick={() => setShowMobileEditor(false)} className="md:hidden p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted transition-colors mr-1"><ChevronLeft className="w-4 h-4" /></button>
            <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold"><Bold className="w-3.5 h-3.5" /></ToolBtn>
            <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic"><Italic className="w-3.5 h-3.5" /></ToolBtn>
            <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon className="w-3.5 h-3.5" /></ToolBtn>
            <ToolBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strike"><Strikethrough className="w-3.5 h-3.5" /></ToolBtn>
            <ToolBtn active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight"><Highlighter className="w-3.5 h-3.5" /></ToolBtn>
            <ToolBtn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} title="Code"><Code className="w-3.5 h-3.5" /></ToolBtn>
            <div className="w-px h-4 bg-border mx-0.5 shrink-0" />
            <ToolBtn active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="H1"><Heading1 className="w-3.5 h-3.5" /></ToolBtn>
            <ToolBtn active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="H2"><Heading2 className="w-3.5 h-3.5" /></ToolBtn>
            <ToolBtn active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="H3"><Heading3 className="w-3.5 h-3.5" /></ToolBtn>
            <div className="w-px h-4 bg-border mx-0.5 shrink-0" />
            <ToolBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullets"><List className="w-3.5 h-3.5" /></ToolBtn>
            <ToolBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbers"><ListOrdered className="w-3.5 h-3.5" /></ToolBtn>
            <ToolBtn active={editor.isActive('taskList')} onClick={() => editor.chain().focus().toggleTaskList().run()} title="Tasks"><ListTodo className="w-3.5 h-3.5" /></ToolBtn>
            <ToolBtn active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote"><Quote className="w-3.5 h-3.5" /></ToolBtn>
            <ToolBtn active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block"><Braces className="w-3.5 h-3.5" /></ToolBtn>
            <div className="flex-1" />
            <AnimatePresence mode="wait">
              {saveStatus !== 'idle' && (
                <motion.div key={saveStatus} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-1 text-[11px] text-text-muted mr-1">
                  {saveStatus === 'saving' ? <><Loader2 className="w-3 h-3 animate-spin" /><span className="hidden sm:inline">Saving</span></> : <><Check className="w-3 h-3 text-green-soft" /><span className="hidden sm:inline text-green-soft">Saved</span></>}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-text-secondary">
              <Folder className="w-3 h-3 shrink-0" />
              <input type="text" value={editFolder} onChange={e => onFolderChange(e.target.value)} className="bg-transparent outline-none w-16 text-text-secondary placeholder:text-text-muted font-medium" placeholder="Folder" />
            </div>
            <div className="w-px h-4 bg-border mx-0.5 shrink-0" />
            {/* Attachment / image upload button */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  Array.from(e.target.files).forEach(uploadImageInline)
                  e.target.value = ''
                }
              }}
            />
            <ToolBtn active={false} onClick={() => imageInputRef.current?.click()} title="Attach image (or paste/drag)">
              <ImagePlus className="w-3.5 h-3.5" />
            </ToolBtn>
            <div className="w-px h-4 bg-border mx-0.5 shrink-0" />
            <ToolBtn active={editPinned} onClick={onPinToggle} title={editPinned ? 'Unpin' : 'Pin'}><Pin className="w-3.5 h-3.5" /></ToolBtn>
            <button onClick={() => handleDelete(activeId)} title="Delete" className="w-7 h-7 rounded-md flex items-center justify-center text-text-muted hover:text-red-soft hover:bg-red-soft/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-y-auto overscroll-contain relative">
            <div className="w-full max-w-none px-5 sm:px-8 md:px-12 lg:px-20 xl:px-28 py-6 sm:py-8">
              <textarea ref={titleRef} value={editTitle} onChange={e => onTitleChange(e.target.value)} placeholder="Title" rows={1}
                className="w-full text-2xl sm:text-3xl lg:text-[34px] font-bold text-text-primary bg-transparent resize-none outline-none placeholder:text-text-muted leading-[1.15] tracking-tight mb-2"
                style={{ overflow: 'hidden' }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); editor?.commands.focus('start') } }} />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-text-secondary mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-border/50">
                <span>{activeNote ? fullDate(activeNote.updatedAt) : 'Now'}</span>
                <span>&middot;</span>
                <span>{wordCount(editor?.getHTML() || '')} words</span>
                <span>&middot;</span>
                {/* Tag chips + input */}
                <div ref={tagContainerRef} className="flex flex-wrap items-center gap-1 relative">
                  {editTags.map(tag => (
                    <span key={tag} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-medium">
                      <Hash className="w-2.5 h-2.5" />{tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-text-primary transition-colors ml-0.5"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                  {tagInputActive ? (
                    <input ref={tagInputRef} type="text" value={tagInput}
                      onChange={e => handleTagInputChange(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      onFocus={() => { setShowTagSuggestions(true); updateTagDropdownPos() }}
                      onBlur={() => { setTimeout(() => { setShowTagSuggestions(false); if (!tagInput.trim()) setTagInputActive(false) }, 150); if (tagInput.trim()) addTag(tagInput) }}
                      className="bg-white/[0.04] border border-white/[0.08] rounded-full outline-none px-2.5 py-0.5 text-[10px] text-text-secondary placeholder:text-text-muted w-24 focus:border-accent/30 focus:bg-white/[0.07] transition-colors"
                      placeholder="Add tag..." autoFocus />
                  ) : (
                    <button onClick={activateTagInput}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-text-muted hover:text-accent hover:bg-accent/[0.06] border border-dashed border-white/[0.08] hover:border-accent/30 transition-colors">
                      <Plus className="w-2.5 h-2.5" />Add tag
                    </button>
                  )}
                  {showTagSuggestions && tagDropdownPos && (tagSuggestions.length > 0 || (tagInput.trim() && !allTagsLower.has(tagInput.trim().toLowerCase()))) && createPortal(
                    <AnimatePresence>
                      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.12 }}
                        className="fixed z-[9999] w-52 max-h-[220px] overflow-y-auto rounded-xl border border-white/[0.08] py-1 shadow-2xl"
                        style={{ background: 'rgba(22,22,24,0.98)', backdropFilter: 'blur(20px)', top: tagDropdownPos.top, left: tagDropdownPos.left }}>
                        {tagSuggestions.length > 0 && <div className="px-3 py-1 text-[10px] text-text-muted uppercase tracking-wider font-semibold">Existing tags</div>}
                        {tagSuggestions.map((tag, i) => (
                          <button key={tag} onMouseDown={(e) => { e.preventDefault(); addTag(tag); }} onMouseEnter={() => setTagSuggestIdx(i)}
                            className={`w-full text-left px-3 py-2 text-[11px] flex items-center gap-2 transition-colors ${
                              i === tagSuggestIdx ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:bg-white/[0.05]'
                            }`}>
                            <Hash className="w-3 h-3 shrink-0" />{tag}
                          </button>
                        ))}
                        {tagInput.trim() && !allTagsLower.has(tagInput.trim().toLowerCase()) && (
                          <>
                            {tagSuggestions.length > 0 && <div className="h-px bg-white/[0.06] mx-2 my-0.5" />}
                            <button onMouseDown={(e) => { e.preventDefault(); addTag(tagInput); }}
                              className="w-full text-left px-3 py-2 text-[11px] flex items-center gap-2 text-accent hover:bg-accent/10 transition-colors">
                              <Plus className="w-3 h-3 shrink-0" />Create "{tagInput.trim()}"
                            </button>
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>,
                    document.body
                  )}
                </div>
              </div>
              <BubbleMenu editor={editor}
                className="flex items-center gap-0.5 rounded-xl border border-white/[0.1] px-1.5 py-1 shadow-2xl bg-[rgba(28,28,30,0.96)] backdrop-blur-xl">
                <ToolBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-3.5 h-3.5" /></ToolBtn>
                <ToolBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-3.5 h-3.5" /></ToolBtn>
                <ToolBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon className="w-3.5 h-3.5" /></ToolBtn>
                <ToolBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className="w-3.5 h-3.5" /></ToolBtn>
                <div className="w-px h-4 bg-white/[0.1] mx-0.5" />
                <ToolBtn active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}><Highlighter className="w-3.5 h-3.5" /></ToolBtn>
                <ToolBtn active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code className="w-3.5 h-3.5" /></ToolBtn>
              </BubbleMenu>
              <EditorContent editor={editor} />
              {/* Small attachments tray — only shown if photos exist */}
              {editPhotos.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/30">
                  <div className="flex flex-wrap gap-2">
                    {editPhotos.map((url, i) => (
                      <div key={i} className="relative group w-20 h-20 rounded-lg overflow-hidden bg-bg-elevated">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => { const updated = editPhotos.filter((_, j) => j !== i); setEditPhotos(updated); editPhotosRef.current = updated; doSave() }}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <AnimatePresence>
                {slashOpen && filteredSlashCmds.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.12 }}
                    className="absolute left-5 sm:left-8 md:left-12 lg:left-20 xl:left-28 z-[100] w-56 rounded-xl border border-white/[0.1] py-1.5 shadow-2xl overflow-hidden"
                    style={{ background: 'rgba(28,28,30,0.96)', backdropFilter: 'blur(16px)' }}>
                    <div className="px-3 py-1.5 text-[10px] text-text-muted uppercase tracking-wider font-semibold">Insert Block</div>
                    {filteredSlashCmds.map((cmd, i) => (
                      <button key={cmd.label} onClick={() => runSlashCmd(i)} onMouseEnter={() => setSlashIndex(i)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 transition-colors ${i === slashIndex ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:bg-white/[0.04]'}`}>
                        <cmd.icon className="w-4 h-4 shrink-0" />{cmd.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="sm:hidden flex items-center gap-2 px-4 py-2 border-t border-border text-[11px]">
            <div className="flex items-center gap-1 text-text-secondary flex-1"><Folder className="w-3 h-3" /><input type="text" value={editFolder} onChange={e => onFolderChange(e.target.value)} className="bg-transparent outline-none flex-1 text-text-secondary placeholder:text-text-muted" placeholder="Folder" /></div>
          </div>
        </>) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
            <div className="w-20 h-20 rounded-3xl bg-white/[0.02] border border-border/50 flex items-center justify-center"><FileText className="w-8 h-8 text-text-muted" /></div>
            <div className="text-center">
              <p className="text-sm text-text-muted font-medium">No note selected</p>
              <p className="text-xs text-text-muted mt-1">Select a note or create one</p>
            </div>
            <button onClick={createNote} className="mt-2 px-4 py-2 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/15 transition-colors">New Note</button>
          </div>
        )}
      </div>
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[200] flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => { setModal(null); setModalInput('') }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[340px] rounded-2xl border border-white/[0.08] shadow-2xl"
              style={{ background: 'rgba(28,28,30,0.97)' }}
            >
              <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    modal.type === 'delete' ? 'bg-red-soft/15' : 'bg-accent/15'
                  }`}>
                    {modal.type === 'delete'
                      ? <Trash2 className="w-4 h-4 text-red-soft" />
                      : modal.type === 'tag'
                      ? <Tag className="w-4 h-4 text-accent" />
                      : <FolderPlus className="w-4 h-4 text-accent" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">
                      {modal.type === 'delete' ? 'Delete Note' : modal.type === 'tag' ? 'New Tag' : 'New Folder'}
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      {modal.type === 'delete' ? 'This action cannot be undone.' : modal.type === 'tag' ? 'Create a tag to categorize your notes.' : 'Create a folder to organize your notes.'}
                    </p>
                  </div>
                </div>
                {(modal.type === 'folder' || modal.type === 'tag') && (
                  <div className="relative">
                    <input
                      ref={modalInputRef}
                      type="text"
                      value={modalInput}
                      onChange={e => setModalInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { modal.type === 'tag' ? confirmCreateTag() : confirmCreateFolder() } if (e.key === 'Escape') { setModal(null); setModalInput('') } }}
                      placeholder={modal.type === 'tag' ? 'Tag name' : 'Folder name'}
                      className="w-full mt-2 px-3.5 py-2.5 rounded-xl text-sm bg-white/[0.05] border border-white/[0.08] text-text-primary placeholder:text-text-muted outline-none focus:border-accent/40 focus:bg-white/[0.07] transition-colors"
                      autoFocus
                    />
                    {modal.type === 'tag' && modalTagSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-2 z-[250] max-h-44 overflow-y-auto rounded-xl border border-white/[0.08] py-1 shadow-2xl"
                        style={{ background: 'rgba(22,22,24,0.98)', backdropFilter: 'blur(16px)' }}>
                        <div className="px-3 py-1 text-[10px] text-text-muted uppercase tracking-wider font-semibold">Existing tags</div>
                        {modalTagSuggestions.map(tag => (
                          <button key={tag} onMouseDown={(e) => { e.preventDefault(); setModalInput(tag); }}
                            className="w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-white/[0.04] hover:text-text-primary transition-colors flex items-center gap-2">
                            <Hash className="w-3 h-3 shrink-0" />{tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex border-t border-white/[0.06]">
                <button
                  onClick={() => { setModal(null); setModalInput('') }}
                  className="flex-1 py-3 text-xs font-medium text-text-secondary hover:bg-white/[0.04] rounded-bl-2xl transition-colors"
                >Cancel</button>
                <div className="w-px bg-white/[0.06]" />
                <button
                  onClick={modal.type === 'delete' ? confirmDelete : modal.type === 'tag' ? confirmCreateTag : confirmCreateFolder}
                  className={`flex-1 py-3 text-xs font-semibold rounded-br-2xl transition-colors ${
                    modal.type === 'delete'
                      ? 'text-red-soft hover:bg-red-soft/10'
                      : 'text-accent hover:bg-accent/10'
                  }`}
                >{modal.type === 'delete' ? 'Delete' : 'Create'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
