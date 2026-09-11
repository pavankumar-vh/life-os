import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 6) return 'Late night'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  if (hour < 21) return 'Good evening'
  return 'Good night'
}

export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

/**
 * Day Progress: measures progress through waking hours (6 AM → 11 PM).
 * Returns 0 before 6 AM, 100 after 11 PM, linear 0–100 in between.
 */
export function getDayProgress(): number {
  const now = new Date()
  const totalMinutes = now.getHours() * 60 + now.getMinutes()
  const DAY_START = 6 * 60   // 6:00 AM in minutes
  const DAY_END   = 23 * 60  // 11:00 PM in minutes
  const WINDOW    = DAY_END - DAY_START // 1020 min = 17 hours
  if (totalMinutes <= DAY_START) return 0
  if (totalMinutes >= DAY_END) return 100
  return Math.round(((totalMinutes - DAY_START) / WINDOW) * 100)
}

export function toISODate(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
