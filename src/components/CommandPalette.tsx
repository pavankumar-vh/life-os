'use client'

import { useEffect } from 'react'
import { Command } from 'cmdk'
import { useAppStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Flame, BookOpen, Dumbbell, Apple,
  CheckSquare, Target, Plus, Search
} from 'lucide-react'

const commands = [
  { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, group: 'Navigate', action: 'navigate' },
  { id: 'habits', label: 'Go to Habits', icon: Flame, group: 'Navigate', action: 'navigate' },
  { id: 'journal', label: 'Go to Journal', icon: BookOpen, group: 'Navigate', action: 'navigate' },
  { id: 'gym', label: 'Go to Gym', icon: Dumbbell, group: 'Navigate', action: 'navigate' },
  { id: 'diet', label: 'Go to Diet', icon: Apple, group: 'Navigate', action: 'navigate' },
  { id: 'tasks', label: 'Go to Tasks', icon: CheckSquare, group: 'Navigate', action: 'navigate' },
  { id: 'goals', label: 'Go to Goals', icon: Target, group: 'Navigate', action: 'navigate' },
  { id: 'add-habit', label: 'Add New Habit', icon: Plus, group: 'Quick Actions', action: 'add-habit' },
  { id: 'add-workout', label: 'Log Workout', icon: Dumbbell, group: 'Quick Actions', action: 'add-workout' },
  { id: 'add-meal', label: 'Log Meal', icon: Apple, group: 'Quick Actions', action: 'add-meal' },
  { id: 'add-task', label: 'Add Task', icon: CheckSquare, group: 'Quick Actions', action: 'add-task' },
  { id: 'write-journal', label: 'Write Journal Entry', icon: BookOpen, group: 'Quick Actions', action: 'write-journal' },
]

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setActiveView } = useAppStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCommandPaletteOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setCommandPaletteOpen])

  const handleSelect = (cmd: typeof commands[0]) => {
    setCommandPaletteOpen(false)
    if (cmd.action === 'navigate') {
      setActiveView(cmd.id)
    } else {
      // Quick actions navigate to the relevant view
      const viewMap: Record<string, string> = {
        'add-habit': 'habits',
        'add-workout': 'gym',
        'add-meal': 'diet',
        'add-task': 'tasks',
        'write-journal': 'journal',
      }
      setActiveView(viewMap[cmd.action] || 'dashboard')
    }
  }

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setCommandPaletteOpen(false)}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50"
          >
            <Command
              className="bg-bg-surface border-3 border-brutal-yellow shadow-brutal overflow-hidden"
              label="Command palette"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b-3 border-border">
                <Search className="w-4 h-4 text-brutal-yellow" />
                <Command.Input
                  placeholder="Type a command..."
                  className="flex-1 bg-transparent font-mono text-sm text-text-primary placeholder:text-text-muted outline-none"
                  autoFocus
                />
                <kbd className="kbd">ESC</kbd>
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-4 py-8 text-center text-text-muted font-mono text-sm">
                  No results found.
                </Command.Empty>

                {['Navigate', 'Quick Actions'].map((group) => (
                  <Command.Group
                    key={group}
                    heading={group}
                    className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-text-muted [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2"
                  >
                    {commands
                      .filter((cmd) => cmd.group === group)
                      .map((cmd) => (
                        <Command.Item
                          key={cmd.id}
                          value={cmd.label}
                          onSelect={() => handleSelect(cmd)}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer font-mono text-sm text-text-secondary
                                   data-[selected=true]:bg-brutal-yellow data-[selected=true]:text-black
                                   data-[selected=true]:border-2 data-[selected=true]:border-black
                                   transition-colors"
                        >
                          <cmd.icon className="w-4 h-4" />
                          <span>{cmd.label}</span>
                        </Command.Item>
                      ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
