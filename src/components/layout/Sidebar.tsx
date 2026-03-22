'use client'

import { useAppStore, useAuthStore } from '@/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Flame, BookOpen, Dumbbell,
  Apple, CheckSquare, Target, ChevronLeft,
  LogOut, Command
} from 'lucide-react'
import { motion } from 'framer-motion'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: '⌘1' },
  { id: 'habits', label: 'Habits', icon: Flame, shortcut: '⌘2' },
  { id: 'journal', label: 'Journal', icon: BookOpen, shortcut: '⌘3' },
  { id: 'gym', label: 'Gym', icon: Dumbbell, shortcut: '⌘4' },
  { id: 'diet', label: 'Diet', icon: Apple, shortcut: '⌘5' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, shortcut: '⌘6' },
  { id: 'goals', label: 'Goals', icon: Target, shortcut: '⌘7' },
]

export function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, toggleSidebar, setCommandPaletteOpen } = useAppStore()
  const { user, logout } = useAuthStore()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-bg-surface border-r-3 border-border z-30',
        'hidden md:flex flex-col transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b-3 border-border">
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 bg-brutal-yellow border-2 border-black flex items-center justify-center">
              <span className="font-mono font-black text-black text-sm">L</span>
            </div>
            <span className="font-display font-bold text-lg tracking-tight">LifeOS</span>
          </motion.div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-bg-hover rounded transition-colors text-text-muted hover:text-text-primary"
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Command Palette Trigger */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 bg-bg-elevated border-2 border-border-strong',
            'text-text-muted text-sm hover:border-brutal-yellow hover:text-text-primary transition-all',
            sidebarCollapsed && 'justify-center px-2'
          )}
        >
          <Command className="w-3.5 h-3.5 shrink-0" />
          {!sidebarCollapsed && (
            <>
              <span className="flex-1 text-left">Search...</span>
              <kbd className="kbd">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-100 group',
                'font-mono text-sm uppercase tracking-wide',
                sidebarCollapsed && 'justify-center px-2',
                isActive
                  ? 'bg-brutal-yellow text-black border-2 border-black shadow-[2px_2px_0px_0px_#000] font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover border-2 border-transparent'
              )}
            >
              <item.icon className={cn('w-4 h-4 shrink-0', isActive && 'text-black')} />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  <span className={cn(
                    'text-[10px] opacity-0 group-hover:opacity-100 transition-opacity',
                    isActive ? 'text-black/50' : 'text-text-muted'
                  )}>
                    {item.shortcut}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </nav>

      {/* User / Logout */}
      <div className="p-3 border-t-3 border-border">
        {user && !sidebarCollapsed && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 bg-brutal-purple border-2 border-black flex items-center justify-center">
              <span className="font-mono font-bold text-white text-xs">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs font-bold truncate">{user.name}</p>
              <p className="text-[10px] text-text-muted font-mono">LVL {user.level} · {user.xp} XP</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-text-muted hover:text-brutal-red',
            'transition-colors font-mono text-xs uppercase',
            sidebarCollapsed && 'justify-center'
          )}
        >
          <LogOut className="w-3.5 h-3.5" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  )
}
