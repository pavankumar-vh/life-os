'use client'

import { useAppStore, useAuthStore } from '@/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Flame, BookOpen, Dumbbell,
  Apple, CheckSquare, Target, ChevronLeft,
  LogOut, Search, Calendar, Settings,
  Scale, Moon, FileText, Clock, Inbox, BarChart3,
  DollarSign, BookMarked, Droplets, LinkIcon, Heart, FolderKanban, Brain, Gift, Zap, PenTool
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  { id: 'settings', label: 'Settings', icon: Settings, shortcut: '\u2318\u0039' },
]

export function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, toggleSidebar, setCommandPaletteOpen } = useAppStore()
  const { user, logout } = useAuthStore()

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
          className="p-1.5 rounded-lg transition-colors text-text-muted hover:text-text-primary"
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

      {/* Nav Items */}
      <nav className="flex-1 px-3 overflow-y-auto no-scrollbar">
        <div className="space-y-0.5">
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
                      background: 'linear-gradient(180deg, #e8d5b7, #c9a87c)',
                      boxShadow: '0 0 8px rgba(232, 213, 183, 0.4)',
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
