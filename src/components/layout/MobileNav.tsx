'use client'

import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Flame, BookOpen, Dumbbell, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'

const mobileNav = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { id: 'habits', icon: Flame, label: 'Habits' },
  { id: 'journal', icon: BookOpen, label: 'Journal' },
  { id: 'gym', icon: Dumbbell, label: 'Gym' },
  { id: 'calendar', icon: Calendar, label: 'Calendar' },
]

export function MobileNav() {
  const { activeView, setActiveView } = useAppStore()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden z-40"
      style={{
        background: 'rgba(10, 10, 10, 0.8)',
        backdropFilter: 'blur(16px) saturate(150%)',
        WebkitBackdropFilter: 'blur(16px) saturate(150%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: '0 -4px 24px -4px rgba(0, 0, 0, 0.3)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {mobileNav.map((item) => {
          const isActive = activeView === item.id
          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-2xl relative',
                isActive ? 'text-accent' : 'text-text-muted'
              )}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-active"
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: 'rgba(232, 213, 183, 0.08)',
                    boxShadow: '0 0 20px -4px rgba(232, 213, 183, 0.15)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon className={cn('w-5 h-5 relative z-10', isActive && 'drop-shadow-[0_0_6px_rgba(232,213,183,0.3)]')} />
              <span className={cn(
                'text-[10px] relative z-10 transition-all duration-200',
                isActive ? 'font-medium' : ''
              )}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  className="absolute -top-0.5 w-6 h-0.5 rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent, #e8d5b7, transparent)',
                    boxShadow: '0 0 8px rgba(232, 213, 183, 0.4)',
                  }}
                  layoutId="mobile-dot"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}
