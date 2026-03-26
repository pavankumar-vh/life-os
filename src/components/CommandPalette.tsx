'use client'

import { useEffect } from 'react'
import { Command } from 'cmdk'
import { useAppStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Flame, BookOpen, Dumbbell, Apple,
  CheckSquare, Target, Plus, Search, Calendar, Settings, Download,
  Scale, Moon, FileText, Clock, Inbox, BarChart3,
  DollarSign, BookMarked, Droplets, LinkIcon, Heart, FolderKanban, Brain, Gift
} from 'lucide-react'

const commands = [
  { id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard, group: 'Navigate', action: 'navigate' },
  { id: 'habits', label: 'Go to Habits', icon: Flame, group: 'Navigate', action: 'navigate' },
  { id: 'journal', label: 'Go to Journal', icon: BookOpen, group: 'Navigate', action: 'navigate' },
  { id: 'gym', label: 'Go to Gym', icon: Dumbbell, group: 'Navigate', action: 'navigate' },
  { id: 'diet', label: 'Go to Diet', icon: Apple, group: 'Navigate', action: 'navigate' },
  { id: 'tasks', label: 'Go to Tasks', icon: CheckSquare, group: 'Navigate', action: 'navigate' },
  { id: 'goals', label: 'Go to Goals', icon: Target, group: 'Navigate', action: 'navigate' },
  { id: 'calendar', label: 'Go to Calendar', icon: Calendar, group: 'Navigate', action: 'navigate' },
  { id: 'settings', label: 'Go to Settings', icon: Settings, group: 'Navigate', action: 'navigate' },
  { id: 'body', label: 'Go to Body Tracker', icon: Scale, group: 'Navigate', action: 'navigate' },
  { id: 'sleep', label: 'Go to Sleep Tracker', icon: Moon, group: 'Navigate', action: 'navigate' },
  { id: 'notes', label: 'Go to Notes', icon: FileText, group: 'Navigate', action: 'navigate' },
  { id: 'pomodoro', label: 'Go to Focus Timer', icon: Clock, group: 'Navigate', action: 'navigate' },
  { id: 'capture', label: 'Go to Quick Capture', icon: Inbox, group: 'Navigate', action: 'navigate' },
  { id: 'review', label: 'Go to Weekly Review', icon: BarChart3, group: 'Navigate', action: 'navigate' },
  { id: 'expenses', label: 'Go to Expenses', icon: DollarSign, group: 'Navigate', action: 'navigate' },
  { id: 'reading', label: 'Go to Reading List', icon: BookMarked, group: 'Navigate', action: 'navigate' },
  { id: 'water', label: 'Go to Water Tracker', icon: Droplets, group: 'Navigate', action: 'navigate' },
  { id: 'bookmarks', label: 'Go to Bookmarks', icon: LinkIcon, group: 'Navigate', action: 'navigate' },
  { id: 'gratitude', label: 'Go to Gratitude', icon: Heart, group: 'Navigate', action: 'navigate' },
  { id: 'projects', label: 'Go to Projects', icon: FolderKanban, group: 'Navigate', action: 'navigate' },
  { id: 'flashcards', label: 'Go to Flashcards', icon: Brain, group: 'Navigate', action: 'navigate' },
  { id: 'wishlist', label: 'Go to Wishlist', icon: Gift, group: 'Navigate', action: 'navigate' },
  { id: 'add-habit', label: 'Add New Habit', icon: Plus, group: 'Quick Actions', action: 'add-habit' },
  { id: 'add-workout', label: 'Log Workout', icon: Dumbbell, group: 'Quick Actions', action: 'add-workout' },
  { id: 'add-meal', label: 'Log Meal', icon: Apple, group: 'Quick Actions', action: 'add-meal' },
  { id: 'add-task', label: 'Add Task', icon: CheckSquare, group: 'Quick Actions', action: 'add-task' },
  { id: 'write-journal', label: 'Write Journal Entry', icon: BookOpen, group: 'Quick Actions', action: 'write-journal' },
  { id: 'export-backup', label: 'Export Backup', icon: Download, group: 'Quick Actions', action: 'export-backup' },
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
    } else if (cmd.action === 'export-backup') {
      setActiveView('settings')
    } else {
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(8px) saturate(120%)',
              WebkitBackdropFilter: 'blur(8px) saturate(120%)',
            }}
            onClick={() => setCommandPaletteOpen(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.95, y: -20, filter: 'blur(8px)' }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[18%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 px-4"
          >
            <Command
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(15, 15, 15, 0.88)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(40px) saturate(180%)',
                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                boxShadow: '0 24px 64px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              }}
              label="Command palette"
            >
              <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <Search className="w-4 h-4 text-accent/60 shrink-0" />
                <Command.Input
                  placeholder="Type a command..."
                  className="flex-1 bg-transparent text-[15px] text-text-primary placeholder:text-text-muted outline-none"
                  autoFocus
                />
                <span className="kbd shrink-0">ESC</span>
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-2 no-scrollbar">
                <Command.Empty className="px-4 py-10 text-center text-text-muted text-sm">
                  No results found.
                </Command.Empty>

                {['Navigate', 'Quick Actions'].map((group) => (
                  <Command.Group
                    key={group}
                    heading={group}
                    className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-text-muted [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5"
                  >
                    {commands
                      .filter((cmd) => cmd.group === group)
                      .map((cmd) => (
                        <Command.Item
                          key={cmd.id}
                          value={cmd.label}
                          onSelect={() => handleSelect(cmd)}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-xl text-sm text-text-secondary
                                   data-[selected=true]:bg-[rgba(232,213,183,0.06)] data-[selected=true]:text-text-primary
                                   transition-all duration-200"
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}
                          >
                            <cmd.icon className="w-3.5 h-3.5 text-text-muted" />
                          </div>
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
