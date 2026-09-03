'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useCaptureStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Search, Inbox, Lightbulb, CheckSquare, Bell, Brain,
  Send, Check, Hash, X, Filter, ChevronDown,
} from 'lucide-react'
import { ListSkeleton } from '@/components/Skeletons'
import { toast } from '@/components/Toast'
import { createPortal } from 'react-dom'

// ─── Constants ────────────────────────────────────────
const TYPE_CONFIG = {
  thought:  { icon: Brain,       color: 'text-accent',       bg: 'bg-accent/10',       label: 'Thought'  },
  idea:     { icon: Lightbulb,   color: 'text-green-soft',   bg: 'bg-green-soft/10',   label: 'Idea'     },
  todo:     { icon: CheckSquare, color: 'text-blue-soft',    bg: 'bg-blue-soft/10',    label: 'To Do'    },
  reminder: { icon: Bell,        color: 'text-orange-soft',  bg: 'bg-orange-soft/10',  label: 'Reminder' },
} as const

type CaptureType = keyof typeof TYPE_CONFIG

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'yesterday'
  if (d < 7)  return `${d}d ago`
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

// ─── Global Capture Modal ─────────────────────────────
// Exported so AppShell can trigger it via keyboard shortcut
let _openCapture: (() => void) | null = null
export function openGlobalCapture() { _openCapture?.() }

export function QuickCaptureView() {
  const { items, isLoading, fetchCaptures, addCapture, updateCapture, deleteCapture } = useCaptureStore()

  // Input state
  const [text, setText] = useState('')
  const [type, setType] = useState<CaptureType>('thought')
  const [tagInput, setTagInput] = useState('')
  const [pendingTags, setPendingTags] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter state
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'inbox' | 'done'>('inbox')
  const [showFilters, setShowFilters] = useState(false)

  // Global shortcut modal state
  const [showModal, setShowModal] = useState(false)
  const [modalText, setModalText] = useState('')
  const [modalType, setModalType] = useState<CaptureType>('thought')
  const modalInputRef = useRef<HTMLInputElement>(null)

  // Register global open function
  useEffect(() => {
    _openCapture = () => {
      setShowModal(true)
      setModalText('')
      setModalType('thought')
      setTimeout(() => modalInputRef.current?.focus(), 80)
    }
    return () => { _openCapture = null }
  }, [])

  // Keyboard shortcut: Cmd/Ctrl+Shift+C
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'c') {
        e.preventDefault()
        openGlobalCapture()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    fetchCaptures().catch(() => toast.error('Failed to load captures'))
  }, [fetchCaptures])

  // ─── Filtering ────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(item => {
      if (!item?._id) return false
      if (filterStatus === 'inbox' && item.processed) return false
      if (filterStatus === 'done'  && !item.processed) return false
      if (filterType !== 'all' && item.type !== filterType) return false
      if (q) {
        const inText = item.text.toLowerCase().includes(q)
        const inTags = (item.tags || []).some(t => t.includes(q))
        if (!inText && !inTags) return false
      }
      return true
    })
  }, [items, search, filterType, filterStatus])

  const stats = useMemo(() => ({
    total: items.length,
    inbox: items.filter(i => !i.processed).length,
    done:  items.filter(i => i.processed).length,
  }), [items])

  // ─── Tag helpers ──────────────────────────────────
  const addPendingTag = (raw: string) => {
    const t = raw.trim().toLowerCase()
    if (t && !pendingTags.includes(t) && pendingTags.length < 10) {
      setPendingTags(prev => [...prev, t])
    }
    setTagInput('')
  }

  const handleTagKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      addPendingTag(tagInput)
    }
    if (e.key === 'Backspace' && !tagInput && pendingTags.length > 0) {
      setPendingTags(prev => prev.slice(0, -1))
    }
  }

  // ─── Submit ───────────────────────────────────────
  const handleAdd = useCallback(async () => {
    if (!text.trim()) return
    const tags = [...pendingTags]
    if (tagInput.trim()) tags.push(tagInput.trim().toLowerCase())
    await addCapture({ text: text.trim(), type, source: 'manual', tags, processed: false })
      .catch(() => toast.error('Failed to save capture'))
    setText('')
    setPendingTags([])
    setTagInput('')
    inputRef.current?.focus()
  }, [text, type, pendingTags, tagInput, addCapture])

  const handleModalAdd = useCallback(async () => {
    if (!modalText.trim()) return
    await addCapture({ text: modalText.trim(), type: modalType, source: 'manual', tags: [], processed: false })
      .catch(() => toast.error('Failed to save capture'))
    setModalText('')
    setShowModal(false)
    toast.success('Captured!')
  }, [modalText, modalType, addCapture])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd() }
  }

  // ─── Render ───────────────────────────────────────
  return (
    <>
      {/* ── Global Quick-Capture Modal ─────────────────── */}
      <AnimatePresence>
        {showModal && createPortal(
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9000] flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              transition={{ type: 'spring', stiffness: 480, damping: 32 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[520px] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden"
              style={{ background: 'rgba(24,24,26,0.97)' }}
            >
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <Inbox className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-sm font-semibold text-text-primary">Universal Capture</span>
                  <span className="ml-auto text-[10px] text-text-muted">⌘⇧C</span>
                  <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-white/[0.06] text-text-muted">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Type selector */}
                <div className="flex gap-1 mb-3">
                  {(Object.entries(TYPE_CONFIG) as [CaptureType, typeof TYPE_CONFIG[CaptureType]][]).map(([key, cfg]) => (
                    <button key={key} onClick={() => setModalType(key)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] transition-all ${
                        modalType === key ? `${cfg.bg} ${cfg.color} font-medium` : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.07]'
                      }`}>
                      <cfg.icon className="w-3 h-3" />{cfg.label}
                    </button>
                  ))}
                </div>
                <input
                  ref={modalInputRef}
                  type="text"
                  value={modalText}
                  onChange={e => setModalText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); handleModalAdd() }
                    if (e.key === 'Escape') setShowModal(false)
                  }}
                  placeholder="What's on your mind? Press Enter to capture…"
                  className="input w-full text-sm"
                  autoComplete="off"
                />
              </div>
              <div className="flex border-t border-white/[0.06]">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 text-xs text-text-secondary hover:bg-white/[0.04] transition-colors">
                  Cancel
                </button>
                <div className="w-px bg-white/[0.06]" />
                <button onClick={handleModalAdd} disabled={!modalText.trim()}
                  className="flex-1 py-2.5 text-xs font-semibold text-accent hover:bg-accent/10 transition-colors disabled:opacity-40">
                  Capture
                </button>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>

      {/* ── Page Content ───────────────────────────────── */}
      <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Inbox className="w-6 h-6 text-accent" /> Universal Capture
            </h1>
            <p className="text-text-muted text-xs mt-0.5">Dump anything — think later. <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px]">⌘⇧C</kbd> from anywhere.</p>
          </div>
        </div>

        {/* Input card */}
        <div className="card mb-5 border-accent/20">
          {/* Type pills */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {(Object.entries(TYPE_CONFIG) as [CaptureType, typeof TYPE_CONFIG[CaptureType]][]).map(([key, cfg]) => (
              <button key={key} onClick={() => setType(key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all ${
                  type === key ? `${cfg.bg} ${cfg.color} font-medium` : 'bg-bg-elevated text-text-muted hover:bg-bg-hover'
                }`}>
                <cfg.icon className="w-3 h-3" />{cfg.label}
              </button>
            ))}
          </div>

          {/* Main input row */}
          <div className="flex gap-2 mb-2">
            <input
              ref={inputRef}
              type="text" value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind? Press Enter to capture…"
              className="input flex-1 text-sm"
              autoFocus
            />
            <button onClick={handleAdd} disabled={!text.trim()} className="btn px-3 shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Tag input */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Hash className="w-3 h-3 text-text-muted shrink-0" />
            {pendingTags.map(t => (
              <span key={t} className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[11px] font-medium">
                {t}
                <button onClick={() => setPendingTags(p => p.filter(x => x !== t))} className="hover:text-text-primary">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <input
              type="text" value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKey}
              onBlur={() => { if (tagInput.trim()) addPendingTag(tagInput) }}
              placeholder="Add tags… (Enter or comma)"
              className="bg-transparent outline-none text-[11px] text-text-secondary placeholder:text-text-muted flex-1 min-w-[120px]"
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="card text-center py-3">
            <p className="text-xl font-bold text-accent">{stats.total}</p>
            <p className="text-[11px] text-text-secondary">Total</p>
          </div>
          <div className="card text-center py-3">
            <p className="text-xl font-bold text-orange-soft">{stats.inbox}</p>
            <p className="text-[11px] text-text-secondary">Inbox</p>
          </div>
          <div className="card text-center py-3">
            <p className="text-xl font-bold text-green-soft">{stats.done}</p>
            <p className="text-[11px] text-text-secondary">Processed</p>
          </div>
        </div>

        {/* Search + Filter row */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search captures…"
              className="input w-full pl-9 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-all ${
              showFilters || filterType !== 'all' ? 'border-accent/30 bg-accent/10 text-accent' : 'border-border text-text-muted hover:text-text-primary'
            }`}>
            <Filter className="w-3.5 h-3.5" />
            Filters
            <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expanded filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-3">
              <div className="card py-3 flex flex-wrap gap-4">
                {/* Status filter */}
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Status</p>
                  <div className="flex gap-1">
                    {(['all', 'inbox', 'done'] as const).map(f => (
                      <button key={f} onClick={() => setFilterStatus(f)}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-all capitalize ${
                          filterStatus === f ? 'bg-accent/15 text-accent font-medium' : 'bg-bg-elevated text-text-muted hover:bg-bg-hover'
                        }`}>{f === 'inbox' ? `Inbox (${stats.inbox})` : f}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Type filter */}
                <div>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Type</p>
                  <div className="flex gap-1 flex-wrap">
                    <button onClick={() => setFilterType('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-all ${filterType === 'all' ? 'bg-accent/15 text-accent font-medium' : 'bg-bg-elevated text-text-muted hover:bg-bg-hover'}`}>
                      All
                    </button>
                    {(Object.entries(TYPE_CONFIG) as [CaptureType, typeof TYPE_CONFIG[CaptureType]][]).map(([key, cfg]) => (
                      <button key={key} onClick={() => setFilterType(key)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all ${
                          filterType === key ? `${cfg.bg} ${cfg.color} font-medium` : 'bg-bg-elevated text-text-muted hover:bg-bg-hover'
                        }`}>
                        <cfg.icon className="w-3 h-3" />{cfg.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result count */}
        {(search || filterType !== 'all' || filterStatus !== 'inbox') && (
          <p className="text-[11px] text-text-muted mb-2">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
        )}

        {/* List */}
        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : filtered.length === 0 ? (
          <div className="card text-center py-14">
            <Inbox className="w-8 h-8 text-text-muted/40 mx-auto mb-2" />
            <p className="text-sm text-text-muted font-medium">
              {filterStatus === 'inbox' ? 'Inbox zero! 🎉' : search ? `No captures matching "${search}"` : 'Nothing here yet'}
            </p>
            <p className="text-xs text-text-muted mt-1">Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06]">Enter</kbd> above to capture something</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence initial={false}>
              {filtered.map((item, i) => {
                const cfg = TYPE_CONFIG[item.type as CaptureType] || TYPE_CONFIG.thought
                return (
                  <motion.div key={item._id}
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                    transition={{ delay: Math.min(i * 0.015, 0.2) }}
                    className={`card group flex items-start gap-3 ${item.processed ? 'opacity-50' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                      <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${item.processed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                        {item.text}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                        {(item.tags || []).map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-text-muted">#{tag}</span>
                        ))}
                        <span className="text-[11px] text-text-muted ml-auto">{relTime(item.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-all shrink-0">
                      <button
                        onClick={() => updateCapture(item._id, { processed: !item.processed }).catch(() => toast.error('Failed to update'))}
                        className={`p-1.5 rounded-lg transition-colors ${item.processed ? 'text-text-muted hover:bg-white/[0.06]' : 'text-green-soft hover:bg-green-soft/10'}`}
                        title={item.processed ? 'Mark unprocessed' : 'Mark processed'}>
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm('Delete this capture?')) deleteCapture(item._id).catch(() => toast.error('Failed to delete')) }}
                        className="p-1.5 rounded-lg text-text-muted hover:text-red-soft hover:bg-red-soft/10 transition-colors"
                        title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </>
  )
}
