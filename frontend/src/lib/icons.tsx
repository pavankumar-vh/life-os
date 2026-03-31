'use client'

import {
  Frown, Meh, Smile, SmilePlus, Flame,
  Zap, Droplets, BookOpen, PersonStanding, Dumbbell,
  Target, Moon, Salad, Pill, PenLine,
  Brain, Music, Ban, Sunrise, Monitor,
  Palette, Trophy, Rocket, Sprout, Star,
  ShoppingCart, Plane, MessageCircle,
  type LucideIcon
} from 'lucide-react'

// Mood icons mapped by mood level (1-5)
export const MOOD_ICONS: LucideIcon[] = [Frown, Meh, Smile, SmilePlus, Flame]
export const MOOD_LABELS = ['Terrible', 'Bad', 'Okay', 'Good', 'Amazing']
export const MOOD_COLORS = ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400', 'text-accent']

export function MoodIcon({ mood, size = 20, className = '' }: { mood: number; size?: number; className?: string }) {
  const idx = Math.max(0, Math.min(4, mood - 1))
  const Icon = MOOD_ICONS[idx]
  return <Icon size={size} className={`${MOOD_COLORS[idx]} ${className}`} />
}

// Habit icon options (id stored in DB, displayed via component)
export const HABIT_ICONS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: 'zap', icon: Zap, label: 'Energy' },
  { id: 'flame', icon: Flame, label: 'Fire' },
  { id: 'droplets', icon: Droplets, label: 'Water' },
  { id: 'book', icon: BookOpen, label: 'Read' },
  { id: 'meditate', icon: PersonStanding, label: 'Meditate' },
  { id: 'dumbbell', icon: Dumbbell, label: 'Workout' },
  { id: 'run', icon: Rocket, label: 'Run' },
  { id: 'target', icon: Target, label: 'Focus' },
  { id: 'moon', icon: Moon, label: 'Sleep' },
  { id: 'salad', icon: Salad, label: 'Eat Clean' },
  { id: 'pill', icon: Pill, label: 'Medicine' },
  { id: 'pen', icon: PenLine, label: 'Write' },
  { id: 'brain', icon: Brain, label: 'Learn' },
  { id: 'music', icon: Music, label: 'Music' },
  { id: 'ban', icon: Ban, label: 'Avoid' },
  { id: 'sunrise', icon: Sunrise, label: 'Morning' },
  { id: 'monitor', icon: Monitor, label: 'Code' },
  { id: 'palette', icon: Palette, label: 'Create' },
]

export function HabitIcon({ iconId, size = 18, className = '' }: { iconId: string; size?: number; className?: string }) {
  const found = HABIT_ICONS.find(h => h.id === iconId)
  // Fallback for old emoji-based icons stored in DB
  if (!found) return <Zap size={size} className={className} />
  const Icon = found.icon
  return <Icon size={size} className={className} />
}

// Streak level icons
export function StreakIcon({ streak, size = 12, className = '' }: { streak: number; size?: number; className?: string }) {
  if (streak >= 30) return <Flame size={size} className={`text-orange-400 ${className}`} />
  if (streak >= 14) return <Zap size={size} className={`text-yellow-400 ${className}`} />
  if (streak >= 7) return <Trophy size={size} className={`text-blue-400 ${className}`} />
  if (streak >= 3) return <Star size={size} className={`text-purple-400 ${className}`} />
  return <Sprout size={size} className={`text-green-400 ${className}`} />
}

// Wishlist categories
export const WISHLIST_CATEGORIES = [
  { id: 'buy', label: 'Buy', icon: ShoppingCart },
  { id: 'experience', label: 'Experience', icon: Target },
  { id: 'travel', label: 'Travel', icon: Plane },
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'other', label: 'Other', icon: MessageCircle },
] as const

// Timeline type icons (string IDs for API)
export const TIMELINE_ICONS: Record<string, string> = {
  journal: 'book-open',
  workout: 'dumbbell',
  meal: 'salad',
  task: 'check-square',
  goal: 'target',
  habit: 'zap',
}
