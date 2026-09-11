'use client'

import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Flame, BookOpen, Dumbbell, Calendar,
  MoreHorizontal, X,
  Apple, CheckSquare, Target, Scale, Moon, FileText, Clock,
  Inbox, BarChart3, DollarSign, BookMarked, Droplets, LinkIcon,
  Heart, FolderKanban, Brain, Gift, PenTool, Shield, Settings, Zap,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

// Primary 5 always visible in bottom bar
const primaryNav = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { id: 'habits',    icon: Flame,           label: 'Habits' },
  { id: 'tasks',     icon: CheckSquare,     label: 'Tasks' },
  { id: 'journal',   icon: BookOpen,        label: 'Journal' },
  { id: 'calendar',  icon: Calendar,        label: 'More' },
]

// All views shown in the "More" drawer grid
const allNav = [
  { id: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'habits',     icon: Flame,           label: 'Habits' },
  { id: 'journal',    icon: BookOpen,        label: 'Journal' },
  { id: 'tasks',      icon: CheckSquare,     label: 'Tasks' },
  { id: 'goals',      icon: Target,          label: 'Goals' },
  { id: 'calendar',   icon: Calendar,        label: 'Calendar' },
  { id: 'gym',        icon: Dumbbell,        label: 'Gym' },
  { id: 'diet',       icon: Apple,           label: 'Diet' },
  { id: 'body',       icon: Scale,           label: 'Body' },
  { id: 'sleep',      icon: Moon,            label: 'Sleep' },
  { id: 'water',      icon: Droplets,        label: 'Water' },
  { id: 'notes',      icon: FileText,        label: 'Notes' },
  { id: 'pomodoro',   icon: Clock,           label: 'Focus' },
  { id: 'capture',    icon: Inbox,           label: 'Capture' },
  { id: 'review',     icon: BarChart3,       label: 'Review' },
  { id: 'expenses',   icon: DollarSign,      label: 'Expenses' },
  { id: 'reading',    icon: BookMarked,      label: 'Reading' },
  { id: 'bookmarks',  icon: LinkIcon,        label: 'Bookmarks' },
  { id: 'gratitude',  icon: Heart,           label: 'Gratitude' },
  { id: 'projects',   icon: FolderKanban,    label: 'Projects' },
  { id: 'flashcards', icon: Brain,           label: 'Flashcards' },
  { id: 'whiteboard', icon: PenTool,         label: 'Whiteboard' },
  { id: 'wishlist',   icon: Gift,            label: 'Wishlist' },
  { id: 'vault',      icon: Shield,          label: 'Vault' },
  { id: 'settings',   icon: Settings,        label: 'Settings' },
]

export function MobileNav() {
  const { activeView, setActiveView } = useAppStore()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const navigate = (id: string) => {
    setActiveView(id)
    setDrawerOpen(false)
  }

  return (
    <>
      {/* Bottom Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden z-40"
        style={{
          background: 'rgba(10, 10, 10, 0.92)',
          backdropFilter: 'blur(16px) saturate(140%)',
          WebkitBackdropFilter: 'blur(16px) saturate(140%)',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          boxShadow: '0 -4px 24px -8px rgba(0, 0, 0, 0.3)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center justify-around px-1 py-2">
          {/* First 4 primary items */}
          {primaryNav.slice(0, 4).map((item) => {
            const isActive = activeView === item.id
            return (
              <motion.button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl relative min-w-[52px]',
                  isActive ? 'text-accent' : 'text-text-muted'
                )}
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-active"
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: 'rgba(232, 213, 183, 0.08)',
                      boxShadow: '0 0 12px -4px rgba(232, 213, 183, 0.15)',
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <item.icon className="w-5 h-5 relative z-10" />
                <span className={cn('text-[10px] relative z-10 transition-all duration-200', isActive ? 'font-medium' : '')}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    className="absolute -top-0.5 w-6 h-0.5 rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, transparent, #e8d5b7, transparent)',
                      boxShadow: '0 0 6px rgba(232, 213, 183, 0.4)',
                    }}
                    layoutId="mobile-dot"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </motion.button>
            )
          })}

          {/* More button */}
          <motion.button
            onClick={() => setDrawerOpen(true)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl relative min-w-[52px]',
              drawerOpen ? 'text-accent' : 'text-text-muted'
            )}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            {drawerOpen && (
              <motion.div
                className="absolute inset-0 rounded-2xl"
                style={{ background: 'rgba(232, 213, 183, 0.08)' }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              />
            )}
            <MoreHorizontal className="w-5 h-5 relative z-10" />
            <span className="text-[10px] relative z-10">More</span>
          </motion.button>
        </div>
      </nav>

      {/* "More" Full-Screen Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 md:hidden"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
              onClick={() => setDrawerOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden rounded-t-3xl overflow-hidden"
              style={{
                background: 'rgba(12, 12, 14, 0.98)',
                backdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                maxHeight: '80vh',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              {/* Handle + header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: 'rgba(232,213,183,0.1)', border: '1px solid rgba(232,213,183,0.15)' }}>
                    <Zap className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <span className="text-sm font-semibold text-text-primary">All Views</span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drag handle bar */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/10" />

              {/* Grid of all nav items */}
              <div className="overflow-y-auto px-4 pb-4" style={{ maxHeight: 'calc(80vh - 64px)' }}>
                <div className="grid grid-cols-4 gap-2">
                  {allNav.map((item) => {
                    const isActive = activeView === item.id
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => navigate(item.id)}
                        whileTap={{ scale: 0.92 }}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all',
                          isActive
                            ? 'text-accent bg-accent/[0.1] border border-accent/20'
                            : 'text-text-secondary hover:bg-white/[0.05] border border-transparent'
                        )}
                      >
                        <item.icon className={cn('w-5 h-5', isActive ? 'text-accent' : 'text-text-muted')} />
                        <span className={cn('text-[10px] text-center leading-tight', isActive ? 'font-medium text-accent' : '')}>
                          {item.label}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
