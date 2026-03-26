import os

sidebar = r"""'use client'

import { useAppStore, useAuthStore } from '@/store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Flame, BookOpen, Dumbbell,
  Apple, CheckSquare, Target, ChevronLeft,
  LogOut, Search
} from 'lucide-react'
import { motion } from 'framer-motion'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: '\u2318\u0031' },
  { id: 'habits', label: 'Habits', icon: Flame, shortcut: '\u2318\u0032' },
  { id: 'journal', label: 'Journal', icon: BookOpen, shortcut: '\u2318\u0033' },
  { id: 'gym', label: 'Gym', icon: Dumbbell, shortcut: '\u2318\u0034' },
  { id: 'diet', label: 'Diet', icon: Apple, shortcut: '\u2318\u0035' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, shortcut: '\u2318\u0036' },
  { id: 'goals', label: 'Goals', icon: Target, shortcut: '\u2318\u0037' },
]

export function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed, toggleSidebar, setCommandPaletteOpen } = useAppStore()
  const { user, logout } = useAuthStore()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-bg-wash border-r border-border z-30',
        'hidden md:flex flex-col transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5">
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center">
              <span className="text-accent font-semibold text-sm">L</span>
            </div>
            <span className="font-semibold text-[15px] text-text-primary tracking-tight">LifeOS</span>
          </motion.div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors text-text-muted hover:text-text-primary"
        >
          <ChevronLeft className={cn('w-4 h-4 transition-transform duration-200', sidebarCollapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Search Trigger */}
      <div className="px-3 pb-3">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg',
            'bg-bg-elevated/50 text-text-muted text-sm',
            'hover:bg-bg-hover transition-colors duration-200',
            sidebarCollapsed && 'justify-center px-2'
          )}
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          {!sidebarCollapsed && (
            <>
              <span className="flex-1 text-left text-[13px]">Search...</span>
              <kbd className="kbd">{'\u2318'}K</kbd>
            </>
          )}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative',
                'text-[13px]',
                sidebarCollapsed && 'justify-center px-2',
                isActive
                  ? 'bg-bg-elevated text-text-primary font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-accent rounded-r-full"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon className={cn('w-[18px] h-[18px] shrink-0', isActive ? 'text-accent' : '')} />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity text-text-muted">
                    {item.shortcut}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </nav>

      {/* User / Logout */}
      <div className="p-3 border-t border-border">
        {user && !sidebarCollapsed && (
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
              <span className="text-accent text-xs font-medium">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{user.name}</p>
              <p className="text-[11px] text-text-muted">Lvl {user.level} {'\u00b7'} {user.xp} XP</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-text-muted hover:text-red-soft',
            'rounded-lg hover:bg-bg-hover transition-colors text-[13px]',
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
"""

with open('src/components/layout/Sidebar.tsx', 'w') as f:
    f.write(sidebar)

print("Sidebar OK")
