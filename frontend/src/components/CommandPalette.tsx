'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Command } from 'cmdk'
import { useAppStore, useAuthStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Flame, BookOpen, Dumbbell, Apple,
  CheckSquare, Target, Plus, Search, Calendar, Settings, Download,
  Scale, Moon, FileText, Clock, Inbox, BarChart3,
  DollarSign, BookMarked, Droplets, LinkIcon, Heart, FolderKanban, Brain, Gift,
  Eye, Loader2, AlertCircle,
} from 'lucide-react'
import { getApiBaseUrl } from '@/lib/api'

// ─── Navigation commands ─────────────────────────────────────────────────────
const commands = [
  { id: 'dashboard',  label: 'Go to Dashboard',      icon: LayoutDashboard, group: 'Navigate', action: 'navigate' },
  { id: 'habits',     label: 'Go to Habits',          icon: Flame,           group: 'Navigate', action: 'navigate' },
  { id: 'journal',    label: 'Go to Journal',         icon: BookOpen,        group: 'Navigate', action: 'navigate' },
  { id: 'gym',        label: 'Go to Gym',             icon: Dumbbell,        group: 'Navigate', action: 'navigate' },
  { id: 'diet',       label: 'Go to Diet',            icon: Apple,           group: 'Navigate', action: 'navigate' },
  { id: 'tasks',      label: 'Go to Tasks',           icon: CheckSquare,     group: 'Navigate', action: 'navigate' },
  { id: 'goals',      label: 'Go to Goals',           icon: Target,          group: 'Navigate', action: 'navigate' },
  { id: 'calendar',   label: 'Go to Calendar',        icon: Calendar,        group: 'Navigate', action: 'navigate' },
  { id: 'settings',   label: 'Go to Settings',        icon: Settings,        group: 'Navigate', action: 'navigate' },
  { id: 'body',       label: 'Go to Body Tracker',    icon: Scale,           group: 'Navigate', action: 'navigate' },
  { id: 'sleep',      label: 'Go to Sleep Tracker',   icon: Moon,            group: 'Navigate', action: 'navigate' },
  { id: 'notes',      label: 'Go to Notes',           icon: FileText,        group: 'Navigate', action: 'navigate' },
  { id: 'pomodoro',   label: 'Go to Focus Timer',     icon: Clock,           group: 'Navigate', action: 'navigate' },
  { id: 'capture',    label: 'Go to Quick Capture',   icon: Inbox,           group: 'Navigate', action: 'navigate' },
  { id: 'review',     label: 'Go to Weekly Review',   icon: BarChart3,       group: 'Navigate', action: 'navigate' },
  { id: 'expenses',   label: 'Go to Expenses',        icon: DollarSign,      group: 'Navigate', action: 'navigate' },
  { id: 'reading',    label: 'Go to Reading List',    icon: BookMarked,      group: 'Navigate', action: 'navigate' },
  { id: 'water',      label: 'Go to Water Tracker',   icon: Droplets,        group: 'Navigate', action: 'navigate' },
  { id: 'bookmarks',  label: 'Go to Bookmarks',       icon: LinkIcon,        group: 'Navigate', action: 'navigate' },
  { id: 'gratitude',  label: 'Go to Gratitude',       icon: Heart,           group: 'Navigate', action: 'navigate' },
  { id: 'projects',   label: 'Go to Projects',        icon: FolderKanban,    group: 'Navigate', action: 'navigate' },
  { id: 'flashcards', label: 'Go to Flashcards',      icon: Brain,           group: 'Navigate', action: 'navigate' },
  { id: 'wishlist',   label: 'Go to Wishlist',        icon: Gift,            group: 'Navigate', action: 'navigate' },
  { id: 'add-habit',    label: 'Add New Habit',    icon: Plus,       group: 'Quick Actions', action: 'add-habit' },
  { id: 'add-workout',  label: 'Log Workout',      icon: Dumbbell,   group: 'Quick Actions', action: 'add-workout' },
  { id: 'add-meal',     label: 'Log Meal',         icon: Apple,      group: 'Quick Actions', action: 'add-meal' },
  { id: 'add-task',     label: 'Add Task',         icon: CheckSquare,group: 'Quick Actions', action: 'add-task' },
  { id: 'write-journal',label: 'Write Journal',    icon: BookOpen,   group: 'Quick Actions', action: 'write-journal' },
  { id: 'export-backup',label: 'Export Backup',    icon: Download,   group: 'Quick Actions', action: 'export-backup' },
  { id: 'toggle-focus', label: 'Toggle Focus Mode',icon: Eye,       group: 'Quick Actions', action: 'toggle-focus' },
]

// ─── Type icon/color map ─────────────────────────────────────────────────────
const TYPE_META: Record<string, { icon: React.ElementType; badge: string; color: string }> = {
  task:     { icon: CheckSquare, badge: 'Task',     color: 'text-blue-soft bg-blue-soft/10' },
  goal:     { icon: Target,      badge: 'Goal',     color: 'text-accent bg-accent/10' },
  note:     { icon: FileText,    badge: 'Note',     color: 'text-purple-soft bg-purple-soft/10' },
  journal:  { icon: BookOpen,    badge: 'Journal',  color: 'text-green-soft bg-green-soft/10' },
  habit:    { icon: Flame,       badge: 'Habit',    color: 'text-orange-soft bg-orange-soft/10' },
  capture:  { icon: Inbox,       badge: 'Capture',  color: 'text-text-muted bg-white/[0.05]' },
  bookmark: { icon: LinkIcon,    badge: 'Bookmark', color: 'text-cyan-400 bg-cyan-400/10' },
  book:     { icon: BookMarked,  badge: 'Book',     color: 'text-green-soft bg-green-soft/10' },
  project:  { icon: FolderKanban,badge: 'Project',  color: 'text-accent bg-accent/10' },
}

// ─── Search result type (mirrors backend SearchResult) ───────────────────────
interface SearchResult {
  id: string
  type: string
  title: string
  subtitle: string
  snippet?: string
  view: string
  recordId: string
  score: number
}

interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
  durationMs: number
}

// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ─── CommandPalette ───────────────────────────────────────────────────────────
export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveView, focusMode, toggleFocusMode } = useAppStore()
  const token = useAuthStore(s => s.token)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 200)

  // Server search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchTotal, setSearchTotal] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  // ── Execute backend search ────────────────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setSearchResults([])
      setSearchTotal(0)
      setSearchError(null)
      return
    }
    // Cancel in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setSearchLoading(true)
    setSearchError(null)
    try {
      const base = getApiBaseUrl()
      const url = `${base}/api/search?q=${encodeURIComponent(q.trim())}&limit=20`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortRef.current.signal,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Search failed' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const data: SearchResponse = await res.json()
      setSearchResults(data.results)
      setSearchTotal(data.total)
    } catch (e) {
      if ((e as Error).name === 'AbortError') return // cancelled — don't update state
      console.error('Global search error:', e)
      setSearchError('Search failed. Try again.')
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [token])

  // Trigger search on debounced query change
  useEffect(() => {
    runSearch(debouncedQuery)
  }, [debouncedQuery, runSearch])

  // Reset on close
  useEffect(() => {
    if (!commandPaletteOpen) {
      setQuery('')
      setSearchResults([])
      setSearchError(null)
      setSearchTotal(0)
      abortRef.current?.abort()
    }
  }, [commandPaletteOpen])

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setCommandPaletteOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setCommandPaletteOpen])

  const handleNavSelect = (cmd: typeof commands[0]) => {
    setCommandPaletteOpen(false)
    if (cmd.action === 'navigate') {
      setActiveView(cmd.id)
    } else if (cmd.action === 'export-backup') {
      setActiveView('settings')
    } else if (cmd.action === 'toggle-focus') {
      toggleFocusMode()
    } else {
      const viewMap: Record<string, string> = {
        'add-habit': 'habits', 'add-workout': 'gym', 'add-meal': 'diet',
        'add-task': 'tasks', 'write-journal': 'journal',
      }
      setActiveView(viewMap[cmd.action] || 'dashboard')
    }
  }

  const handleResultSelect = (result: SearchResult) => {
    setCommandPaletteOpen(false)
    setActiveView(result.view)
  }

  const isSearching = debouncedQuery.trim().length >= 2
  const showCommands = !isSearching

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px) saturate(130%)', WebkitBackdropFilter: 'blur(12px) saturate(130%)' }}
            onClick={() => setCommandPaletteOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[14%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4"
          >
            <Command
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(15,15,15,0.92)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(24px) saturate(150%)',
                WebkitBackdropFilter: 'blur(24px) saturate(150%)',
                boxShadow: '0 24px 64px -12px rgba(0,0,0,0.7), 0 0 48px -16px rgba(232,213,183,0.06)',
              }}
              label="Global search"
              shouldFilter={showCommands} // let cmdk filter nav commands; we do server search
            >
              {/* Input */}
              <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {searchLoading
                  ? <Loader2 className="w-4 h-4 text-accent/60 shrink-0 animate-spin" />
                  : <Search className="w-4 h-4 text-accent/60 shrink-0" />
                }
                <Command.Input
                  placeholder="Search everything or type a command…"
                  className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-muted outline-none"
                  autoFocus
                  value={query}
                  onValueChange={setQuery}
                />
                <span className="kbd shrink-0 text-text-muted text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06]">ESC</span>
              </div>

              <Command.List className="max-h-[420px] overflow-y-auto p-2 no-scrollbar">
                {/* ── Error state ──────────────────────────────────────── */}
                {searchError && (
                  <div className="flex items-center gap-2 px-4 py-3 text-red-soft text-xs">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {searchError}
                  </div>
                )}

                {/* ── Server search results ─────────────────────────────── */}
                {isSearching && !searchError && (
                  <>
                    {searchLoading && searchResults.length === 0 && (
                      <div className="px-4 py-8 text-center text-text-muted text-xs">Searching…</div>
                    )}
                    {!searchLoading && searchResults.length === 0 && (
                      <div className="px-4 py-8 text-center">
                        <p className="text-sm text-text-muted">No results for <span className="text-text-primary">"{debouncedQuery}"</span></p>
                        <p className="text-xs text-text-muted mt-1">Try a different keyword</p>
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <Command.Group
                        heading={`Results${searchTotal > 20 ? ` (showing 20 of ${searchTotal})` : ` (${searchTotal})`}`}
                        className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-accent/60 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5"
                      >
                        {searchResults.map(r => {
                          const meta = TYPE_META[r.type] || TYPE_META.note
                          const Icon = meta.icon
                          return (
                            <Command.Item
                              key={r.id}
                              value={r.id}
                              onSelect={() => handleResultSelect(r)}
                              className="flex items-start gap-3 px-3 py-2.5 cursor-pointer rounded-xl text-sm text-text-secondary data-[selected=true]:bg-[rgba(232,213,183,0.06)] data-[selected=true]:text-text-primary transition-all duration-150"
                            >
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                <Icon className="w-3.5 h-3.5 text-accent/60" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[13px] font-medium text-text-primary truncate max-w-[260px]">{r.title}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider shrink-0 ${meta.color}`}>{meta.badge}</span>
                                </div>
                                <p className="text-xs text-text-muted truncate mt-0.5">{r.subtitle}</p>
                                {r.snippet && (
                                  <p className="text-[11px] text-text-secondary mt-1 line-clamp-1 opacity-70">{r.snippet}</p>
                                )}
                              </div>
                            </Command.Item>
                          )
                        })}
                      </Command.Group>
                    )}
                  </>
                )}

                {/* ── Navigation commands (shown when not searching) ─── */}
                {showCommands && (
                  <>
                    <Command.Empty className="px-4 py-10 text-center text-text-muted text-sm">No results found.</Command.Empty>
                    {['Navigate', 'Quick Actions'].map(group => (
                      <Command.Group
                        key={group}
                        heading={group}
                        className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-text-muted [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5"
                      >
                        {commands.filter(c => c.group === group).map(cmd => (
                          <Command.Item
                            key={cmd.id}
                            value={cmd.label}
                            onSelect={() => handleNavSelect(cmd)}
                            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl text-sm text-text-secondary data-[selected=true]:bg-[rgba(232,213,183,0.06)] data-[selected=true]:text-text-primary transition-all duration-200"
                          >
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <cmd.icon className="w-3.5 h-3.5 text-text-muted" />
                            </div>
                            <span>{cmd.label}</span>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    ))}
                  </>
                )}
              </Command.List>

              {/* Footer */}
              {isSearching && searchResults.length > 0 && (
                <div className="px-4 py-2 border-t border-white/[0.06] flex items-center gap-3 text-[10px] text-text-muted">
                  <span>↑↓ navigate</span>
                  <span>↵ open</span>
                  <span className="ml-auto">{searchTotal} result{searchTotal !== 1 ? 's' : ''} across all data</span>
                </div>
              )}
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
