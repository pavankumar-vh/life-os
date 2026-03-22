'use client'

import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Flame, BookOpen, Dumbbell, Apple } from 'lucide-react'

const mobileNav = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { id: 'habits', icon: Flame, label: 'Habits' },
  { id: 'journal', icon: BookOpen, label: 'Journal' },
  { id: 'gym', icon: Dumbbell, label: 'Gym' },
  { id: 'diet', icon: Apple, label: 'Diet' },
]

export function MobileNav() {
  const { activeView, setActiveView } = useAppStore()

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-bg-surface border-t-3 border-border z-40">
      <div className="flex items-center justify-around px-2 py-1">
        {mobileNav.map((item) => {
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 transition-all',
                isActive
                  ? 'text-brutal-yellow'
                  : 'text-text-muted'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-mono uppercase tracking-wider">{item.label}</span>
              {isActive && (
                <div className="w-1 h-1 bg-brutal-yellow rounded-full mt-0.5" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
