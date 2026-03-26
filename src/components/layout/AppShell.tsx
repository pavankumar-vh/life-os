'use client'

import { useEffect, useState } from 'react'
import { useAuthStore, useAppStore } from '@/store'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { CommandPalette } from '@/components/CommandPalette'
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
import { useHotkeys } from 'react-hotkeys-hook'
import { motion, AnimatePresence } from 'framer-motion'

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
  wishlist: WishlistView,
}

export function AppShell() {
  const { user, token, setToken } = useAuthStore()
  const { activeView, setCommandPaletteOpen, setActiveView, sidebarCollapsed } = useAppStore()
  const [hydrated, setHydrated] = useState(false)

  // Hydrate token from localStorage on mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = localStorage.getItem('lifeos-token')
    if (stored) setToken(stored)
    setHydrated(true)
  }, [setToken])

  // Keyboard shortcuts
  useHotkeys('mod+k', (e) => { e.preventDefault(); setCommandPaletteOpen(true) })
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
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => { if (data._id) useAuthStore.getState().setUser(data) })
        .catch(() => useAuthStore.getState().logout())
    }
  }, [token, user])

  if (!hydrated) return null
  if (!token) return <AuthScreen />

  const ActiveView = views[activeView] || Dashboard

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main
        className={`flex-1 overflow-y-auto transition-all duration-500 ${
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-60'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 pb-24 md:pb-8">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{
                duration: 0.25,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <ActiveView />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <MobileNav />
      <CommandPalette />
    </div>
  )
}
