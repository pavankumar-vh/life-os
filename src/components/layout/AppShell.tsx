'use client'

import { useEffect } from 'react'
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
}

export function AppShell() {
  const { user, token } = useAuthStore()
  const { activeView, setCommandPaletteOpen, setActiveView, sidebarCollapsed } = useAppStore()

  // Keyboard shortcuts
  useHotkeys('mod+k', (e) => { e.preventDefault(); setCommandPaletteOpen(true) })
  useHotkeys('mod+1', () => setActiveView('dashboard'))
  useHotkeys('mod+2', () => setActiveView('habits'))
  useHotkeys('mod+3', () => setActiveView('journal'))
  useHotkeys('mod+4', () => setActiveView('gym'))
  useHotkeys('mod+5', () => setActiveView('diet'))
  useHotkeys('mod+6', () => setActiveView('tasks'))
  useHotkeys('mod+7', () => setActiveView('goals'))

  // Auto-fetch user on mount
  useEffect(() => {
    if (token && !user) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => { if (data._id) useAuthStore.getState().setUser(data) })
        .catch(() => useAuthStore.getState().logout())
    }
  }, [token, user])

  if (!token) return <AuthScreen />

  const ActiveView = views[activeView] || Dashboard

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main
        className={`flex-1 overflow-y-auto transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 pb-24 md:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
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
