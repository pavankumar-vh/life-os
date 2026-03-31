'use client'

import { useEffect, useState } from 'react'
import { useAuthStore, useAppStore } from '@/store'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { CommandPalette } from '@/components/CommandPalette'
import { QuickAddBar } from '@/components/QuickAddBar'
import { ToastContainer } from '@/components/Toast'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { Dashboard } from '@/features/dashboard/Dashboard'
import { HabitsView } from '@/features/habits/HabitsView'
import { JournalView } from '@/features/journal/JournalView'
import { GymView } from '@/features/gym/GymView'
import { DietView } from '@/features/diet/DietView'
import { TasksView } from '@/features/tasks/TasksView'
import { GoalsView } from '@/features/goals/GoalsView'
import { CalendarView } from '@/features/calendar/CalendarView'
import { SettingsView } from '@/features/settings/SettingsView'
import { BodyTrackerView } from '@/features/body/BodyTrackerView'
import { SleepTrackerView } from '@/features/sleep/SleepTrackerView'
import { NotesView } from '@/features/notes/NotesView'
import { PomodoroView } from '@/features/pomodoro/PomodoroView'
import { QuickCaptureView } from '@/features/capture/QuickCaptureView'
import { WeeklyReviewView } from '@/features/review/WeeklyReviewView'
import { ExpenseTrackerView } from '@/features/expenses/ExpenseTrackerView'
import { ReadingListView } from '@/features/reading/ReadingListView'
import { WaterTrackerView } from '@/features/water/WaterTrackerView'
import { BookmarksView } from '@/features/bookmarks/BookmarksView'
import { GratitudeView } from '@/features/gratitude/GratitudeView'
import { ProjectsView } from '@/features/projects/ProjectsView'
import { FlashcardsView } from '@/features/flashcards/FlashcardsView'
import { WishlistView } from '@/features/wishlist/WishlistView'
import dynamic from 'next/dynamic'
const WhiteboardView = dynamic(() => import('@/features/whiteboard/WhiteboardView').then(m => m.WhiteboardView), { ssr: false })
import { ChatPanel } from '@/features/chat/ChatPanel'
import { useHotkeys } from 'react-hotkeys-hook'
import { motion, AnimatePresence, LazyMotion, domAnimation, MotionConfig } from 'framer-motion'
import { Sparkles } from 'lucide-react'

const views: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  habits: HabitsView,
  journal: JournalView,
  gym: GymView,
  diet: DietView,
  tasks: TasksView,
  goals: GoalsView,
  calendar: CalendarView,
  settings: SettingsView,
  body: BodyTrackerView,
  sleep: SleepTrackerView,
  notes: NotesView,
  pomodoro: PomodoroView,
  capture: QuickCaptureView,
  review: WeeklyReviewView,
  expenses: ExpenseTrackerView,
  reading: ReadingListView,
  water: WaterTrackerView,
  bookmarks: BookmarksView,
  gratitude: GratitudeView,
  projects: ProjectsView,
  flashcards: FlashcardsView,
  whiteboard: WhiteboardView,
  wishlist: WishlistView,
}

export function AppShell() {
  const { user, token, setToken } = useAuthStore()
  const { activeView, setCommandPaletteOpen, setActiveView, sidebarCollapsed, focusMode, toggleFocusMode, chatOpen, setChatOpen, toggleChat } = useAppStore()
  const [hydrated, setHydrated] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  // Hydrate token from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = localStorage.getItem('lifeos-token')
    if (stored) setToken(stored)
    // Hydrate accent color
    const accent = localStorage.getItem('lifeos-accent')
    if (accent) document.documentElement.style.setProperty('--accent-dynamic', accent)
    setHydrated(true)
  }, [setToken])

  // Keyboard shortcuts
  useHotkeys('mod+k', (e) => { e.preventDefault(); setCommandPaletteOpen(true) })
  useHotkeys('mod+/', (e) => { e.preventDefault(); toggleFocusMode() })
  useHotkeys('mod+n', (e) => { e.preventDefault(); setQuickAddOpen(true) })
  useHotkeys('mod+j', (e) => { e.preventDefault(); toggleChat() })
  useHotkeys('mod+1', () => setActiveView('dashboard'))
  useHotkeys('mod+2', () => setActiveView('habits'))
  useHotkeys('mod+3', () => setActiveView('journal'))
  useHotkeys('mod+4', () => setActiveView('gym'))
  useHotkeys('mod+5', () => setActiveView('diet'))
  useHotkeys('mod+6', () => setActiveView('tasks'))
  useHotkeys('mod+7', () => setActiveView('goals'))
  useHotkeys('mod+8', () => setActiveView('calendar'))
  useHotkeys('mod+9', () => setActiveView('settings'))

  // Auto-fetch user on mount
  useEffect(() => {
    if (token && !user) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      fetch(`${apiBase}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => { if (data._id) useAuthStore.getState().setUser(data) })
        .catch(() => useAuthStore.getState().logout())
    }
  }, [token, user])

  if (!hydrated) return null
  if (!token) return <AuthScreen />

  const ActiveView = views[activeView] || Dashboard

  return (
    <LazyMotion features={domAnimation}>
    <MotionConfig reducedMotion="user" transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
    <div className="flex h-screen overflow-hidden">
      {!focusMode && <Sidebar />}
      <main
        className={`flex-1 transition-all duration-500 ${
          focusMode ? '' : sidebarCollapsed ? 'md:ml-16' : 'md:ml-60'
        } ${activeView === 'notes' || activeView === 'whiteboard' ? 'overflow-hidden' : 'overflow-y-auto'}`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Notes & Whiteboard get full-bleed layout; everything else stays centered */}
        {activeView === 'notes' || activeView === 'whiteboard' ? (
          <AnimatePresence mode="popLayout">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <ActiveView />
            </motion.div>
          </AnimatePresence>
        ) : (
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 pb-24 md:pb-8">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <ActiveView />
            </motion.div>
          </AnimatePresence>
        </div>
        )}
      </main>
      {!focusMode && <MobileNav />}
      <CommandPalette />
      <QuickAddBar open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />

      {/* Floating AI Chat Button */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={toggleChat}
            className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg shadow-accent/20 md:bottom-8 md:right-8 group"
            style={{
              background: 'linear-gradient(135deg, rgba(232, 213, 183, 0.9), rgba(201, 168, 124, 0.9))',
              boxShadow: '0 4px 24px -4px rgba(232, 213, 183, 0.4), 0 0 0 1px rgba(255,255,255,0.1) inset',
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            title="AI Assistant (⌘J)"
          >
            <Sparkles className="w-5 h-5 text-[#1a1a1a] group-hover:rotate-12 transition-transform duration-200" />
          </motion.button>
        )}
      </AnimatePresence>

      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
      <ToastContainer />
    </div>
    </MotionConfig>
    </LazyMotion>
  )
}
