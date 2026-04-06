'use client'

import { useAppStore, useAuthStore } from '@/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Flame, BookOpen, Dumbbell,
  Apple, CheckSquare, Target, ChevronLeft,
  LogOut, Search, Calendar, Settings,
  Scale, Moon, FileText, Clock, Inbox, BarChart3,
  DollarSign, BookMarked, Droplets, LinkIcon, Heart, FolderKanban, Brain, Gift, Zap, PenTool, Shield
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useState, useCallback, useEffect } from 'react'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: '\u2318\u0031' },
  { id: 'habits', label: 'Habits', icon: Flame, shortcut: '\u2318\u0032' },
  { id: 'journal', label: 'Journal', icon: BookOpen, shortcut: '\u2318\u0033' },
  { id: 'gym', label: 'Gym', icon: Dumbbell, shortcut: '\u2318\u0034' },
  { id: 'diet', label: 'Diet', icon: Apple, shortcut: '\u2318\u0035' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, shortcut: '\u2318\u0036' },
  { id: 'goals', label: 'Goals', icon: Target, shortcut: '\u2318\u0037' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, shortcut: '\u2318\u0038' },
  { id: 'body', label: 'Body', icon: Scale },
  { id: 'sleep', label: 'Sleep', icon: Moon },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'pomodoro', label: 'Focus', icon: Clock },
  { id: 'capture', label: 'Capture', icon: Inbox },
  { id: 'review', label: 'Review', icon: BarChart3 },
  { id: 'expenses', label: 'Expenses', icon: DollarSign },
  { id: 'reading', label: 'Reading', icon: BookMarked },
  { id: 'water', label: 'Water', icon: Droplets },
  { id: 'bookmarks', label: 'Bookmarks', icon: LinkIcon },
  { id: 'gratitude', label: 'Gratitude', icon: Heart },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'flashcards', label: 'Flashcards', icon: Brain },
  { id: 'whiteboard', label: 'Whiteboard', icon: PenTool },
  { id: 'wishlist', label: 'Wishlist', icon: Gift },
  { id: 'vault', label: 'Vault', icon: Shield },
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: '\u2318\u0039' },
]

export function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, toggleSidebar, setCommandPaletteOpen } = useAppStore()
  const { user, logout } = useAuthStore()

  const navRef        = useRef<HTMLElement>(null)
  const trackRef      = useRef<HTMLDivElement>(null)
  const isDragging    = useRef(false)
  const dragStartY    = useRef(0)
  const dragStartTop  = useRef(0)

  const [thumbTop, setThumbTop]       = useState(0)
  const [thumbHeight, setThumbHeight] = useState(0)
  const [showBar, setShowBar]         = useState(false)
  const hideTimer                     = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Recompute thumb size/position from nav scroll state
  const syncThumb = useCallback(() => {
    const nav = navRef.current
    const track = trackRef.current
    if (!nav || !track) return

    const { scrollTop, scrollHeight, clientHeight } = nav
    if (scrollHeight <= clientHeight) { setThumbHeight(0); return }

    const trackH = track.clientHeight
    const ratio  = clientHeight / scrollHeight
    const h      = Math.max(28, trackH * ratio)
    const top    = (scrollTop / (scrollHeight - clientHeight)) * (trackH - h)
    setThumbHeight(h)
    setThumbTop(top)
  }, [])

  // Show scrollbar briefly on scroll, then fade out after 1.8s idle
  const onScroll = useCallback(() => {
    syncThumb()
    setShowBar(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setShowBar(false), 1800)
  }, [syncThumb])

  useEffect(() => {
    syncThumb()
    const nav = navRef.current
    if (nav) nav.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', syncThumb)
    return () => {
      if (nav) nav.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', syncThumb)
    }
  }, [syncThumb, onScroll])

  // Drag handlers
  const onThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current  = true
    dragStartY.current  = e.clientY
    dragStartTop.current = thumbTop
    setShowBar(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const nav   = navRef.current
      const track = trackRef.current
      if (!nav || !track) return
      const dy       = ev.clientY - dragStartY.current
      const trackH   = track.clientHeight
      const maxTop   = trackH - thumbHeight
      const newTop   = Math.max(0, Math.min(dragStartTop.current + dy, maxTop))
      const ratio    = newTop / maxTop
      nav.scrollTop  = ratio * (nav.scrollHeight - nav.clientHeight)
    }
    const onUp = () => {
      isDragging.current = false
      hideTimer.current = setTimeout(() => setShowBar(false), 1800)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Click on track (not thumb) → jump scroll
  const onTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const track = trackRef.current
    const nav   = navRef.current
    if (!track || !nav) return
    const rect   = track.getBoundingClientRect()
    const clickY = e.clientY - rect.top - thumbHeight / 2
    const maxTop = track.clientHeight - thumbHeight
    const ratio  = Math.max(0, Math.min(clickY, maxTop)) / maxTop
    nav.scrollTop = ratio * (nav.scrollHeight - nav.clientHeight)
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full z-30',
        'hidden md:flex flex-col transition-all duration-500',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
      style={{
        background: 'rgba(10, 10, 10, 0.8)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '4px 0 24px -8px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5">
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-2.5"
            >
              <motion.div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(232, 213, 183, 0.15), rgba(232, 213, 183, 0.05))',
                  border: '1px solid rgba(232, 213, 183, 0.1)',
                  boxShadow: '0 0 16px -4px rgba(232, 213, 183, 0.15)',
                }}
                whileHover={{ scale: 1.05 }}
              >
                <Zap className="w-4 h-4 text-accent" />
              </motion.div>
              <span className="font-semibold text-[15px] gradient-text tracking-tight">LifeOS</span>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg transition-colors text-text-muted hover:text-text-primary shrink-0"
          style={{ background: 'rgba(255, 255, 255, 0.04)' }}
          whileHover={{ background: 'rgba(255, 255, 255, 0.08)', scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform duration-300', sidebarCollapsed && 'rotate-180')} />
        </motion.button>
      </div>

      {/* Search Trigger */}
      <div className="px-3 pb-3">
        <motion.button
          onClick={() => setCommandPaletteOpen(true)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl',
            'text-text-muted text-sm',
            sidebarCollapsed && 'justify-center px-2'
          )}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.04)',
          }}
          whileHover={{
            background: 'rgba(255, 255, 255, 0.07)',
            borderColor: 'rgba(255, 255, 255, 0.08)',
          }}
          transition={{ duration: 0.2 }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          {!sidebarCollapsed && (
            <>
              <span className="flex-1 text-left text-[13px]">Search...</span>
              <kbd className="kbd">{'\u2318'}K</kbd>
            </>
          )}
        </motion.button>
      </div>

      {/* Nav Items + custom scrollbar */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* Scrollable nav list */}
        <nav
          ref={navRef}
          className="flex-1 px-3 overflow-y-auto no-scrollbar"
          onMouseEnter={() => { syncThumb(); setShowBar(true); if (hideTimer.current) clearTimeout(hideTimer.current) }}
          onMouseLeave={() => { if (!isDragging.current) { hideTimer.current = setTimeout(() => setShowBar(false), 600) } }}
        >
          <div className="space-y-0.5 pb-2">
            {navItems.map((item) => {
              const isActive = activeView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-xl group relative',
                    'text-[13px] transition-all duration-200',
                    sidebarCollapsed && 'justify-center px-2',
                    isActive
                      ? 'text-text-primary font-medium bg-[rgba(232,213,183,0.08)]'
                      : 'text-text-secondary hover:bg-[rgba(255,255,255,0.05)] hover:translate-x-0.5'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0.5 inset-y-0 my-auto w-[3px] h-4 rounded-full"
                      style={{
                        background: 'linear-gradient(180deg, rgba(var(--accent-r),var(--accent-g),var(--accent-b),1), rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.6))',
                        boxShadow: '0 0 8px rgba(var(--accent-r),var(--accent-g),var(--accent-b),0.4)',
                      }}
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <item.icon className={cn(
                    'w-[18px] h-[18px] shrink-0 transition-colors duration-200',
                    isActive ? 'text-accent' : 'group-hover:text-text-primary'
                  )} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left transition-colors duration-200 group-hover:text-text-primary">{item.label}</span>
                      <span className="text-xs opacity-0 group-hover:opacity-100 transition-all duration-200 text-text-muted">
                        {item.shortcut}
                      </span>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        </nav>

        {/* Custom scrollbar track — shown when hovering or scrolling */}
        <div
          ref={trackRef}
          onClick={onTrackClick}
          className="absolute right-1 top-1 bottom-1 w-[5px] rounded-full cursor-pointer transition-opacity duration-300"
          style={{
            opacity: showBar && thumbHeight > 0 ? 1 : 0,
            background: 'rgba(255,255,255,0.05)',
            pointerEvents: showBar && thumbHeight > 0 ? 'auto' : 'none',
          }}
        >
          {/* Thumb */}
          <motion.div
            onMouseDown={onThumbMouseDown}
            className="absolute left-0 right-0 rounded-full cursor-grab active:cursor-grabbing"
            style={{
              top: thumbTop,
              height: thumbHeight,
              background: `rgba(var(--accent-r), var(--accent-g), var(--accent-b), 0.5)`,
              boxShadow: `0 0 6px rgba(var(--accent-r), var(--accent-g), var(--accent-b), 0.2)`,
            }}
          />
        </div>
      </div>

      {/* User / Logout */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        {user && !sidebarCollapsed && (
          <motion.div
            className="flex items-center gap-3 px-2 py-2.5 mb-1 rounded-xl"
            style={{ background: 'rgba(255, 255, 255, 0.03)' }}
            whileHover={{ background: 'rgba(255, 255, 255, 0.06)' }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(232, 213, 183, 0.2), rgba(167, 139, 250, 0.1))',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <span className="text-accent text-sm font-semibold">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate text-text-primary">{user.name}</p>
              <p className="text-[11px] text-text-muted flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-soft" />
                Lvl {user.level} {'\u00b7'} {user.xp} XP
              </p>
            </div>
          </motion.div>
        )}
        <motion.button
          onClick={logout}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-text-muted',
            'rounded-xl text-[13px]',
            sidebarCollapsed && 'justify-center'
          )}
          whileHover={{ color: 'rgb(251, 113, 133)', background: 'rgba(251, 113, 133, 0.06)' }}
          transition={{ duration: 0.2 }}
        >
          <LogOut className="w-3.5 h-3.5" />
          {!sidebarCollapsed && <span>Logout</span>}
        </motion.button>
      </div>
    </aside>
  )
}
