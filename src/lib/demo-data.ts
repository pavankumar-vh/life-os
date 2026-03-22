import { toISODate } from '@/lib/utils'

const today = toISODate()
const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return toISODate(d) })()
const twoDaysAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 2); return toISODate(d) })()

// Generate last N days
function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i); return toISODate(d)
  })
}

export const DEMO_HABITS = [
  {
    _id: 'dh1', userId: 'demo-user-001', name: 'Meditate', icon: '🧘', color: '#A855F7',
    frequency: 'daily' as const,
    completedDates: lastNDays(30).filter((_, i) => i % 2 === 0 || i < 7),
    streak: 7, bestStreak: 12,
  },
  {
    _id: 'dh2', userId: 'demo-user-001', name: 'Read 30min', icon: '📚', color: '#3B82F6',
    frequency: 'daily' as const,
    completedDates: lastNDays(30).filter((_, i) => i < 14 || i % 3 === 0),
    streak: 14, bestStreak: 21,
  },
  {
    _id: 'dh3', userId: 'demo-user-001', name: 'Workout', icon: '💪', color: '#22C55E',
    frequency: 'daily' as const,
    completedDates: lastNDays(30).filter((_, i) => i < 5 || i % 2 === 0),
    streak: 5, bestStreak: 18,
  },
  {
    _id: 'dh4', userId: 'demo-user-001', name: 'Drink 3L Water', icon: '💧', color: '#06B6D4',
    frequency: 'daily' as const,
    completedDates: lastNDays(30).filter((_, i) => i < 10),
    streak: 10, bestStreak: 10,
  },
  {
    _id: 'dh5', userId: 'demo-user-001', name: 'No Social Media', icon: '📵', color: '#EF4444',
    frequency: 'daily' as const,
    completedDates: lastNDays(30).filter((_, i) => i < 3 || (i > 5 && i < 9)),
    streak: 3, bestStreak: 4,
  },
]

export const DEMO_JOURNAL = [
  {
    _id: 'dj1', userId: 'demo-user-001', date: today,
    title: 'Momentum is building', mood: 4,
    content: '<p>Great day. Hit the gym early, crushed a deadlift PR. Feeling the consistency paying off.</p><p>Need to focus more on deep work in the afternoons — too many distractions.</p>',
    tags: ['gym', 'productivity', 'wins'],
  },
  {
    _id: 'dj2', userId: 'demo-user-001', date: yesterday,
    title: 'Slow but steady', mood: 3,
    content: '<p>Decent day. Finished the API integration. Reading before bed is becoming a solid habit.</p>',
    tags: ['coding', 'habits'],
  },
  {
    _id: 'dj3', userId: 'demo-user-001', date: twoDaysAgo,
    title: 'Reset day', mood: 2,
    content: '<p>Didn\'t sleep well. Skipped the gym. Need to get back on track tomorrow.</p><blockquote>Discipline is doing it when you don\'t feel like it.</blockquote>',
    tags: ['reflection', 'health'],
  },
]

export const DEMO_WORKOUTS = [
  {
    _id: 'dw1', userId: 'demo-user-001', date: today, name: 'Push Day',
    duration: 65, notes: 'Felt strong today',
    exercises: [
      { name: 'Bench Press', sets: [{ reps: 8, weight: 80, unit: 'kg' as const }, { reps: 8, weight: 85, unit: 'kg' as const }, { reps: 6, weight: 90, unit: 'kg' as const }], notes: '' },
      { name: 'Overhead Press', sets: [{ reps: 10, weight: 40, unit: 'kg' as const }, { reps: 8, weight: 45, unit: 'kg' as const }], notes: '' },
      { name: 'Incline Bench', sets: [{ reps: 10, weight: 60, unit: 'kg' as const }, { reps: 8, weight: 65, unit: 'kg' as const }], notes: '' },
      { name: 'Lateral Raise', sets: [{ reps: 15, weight: 12, unit: 'kg' as const }, { reps: 12, weight: 14, unit: 'kg' as const }], notes: '' },
    ],
  },
  {
    _id: 'dw2', userId: 'demo-user-001', date: twoDaysAgo, name: 'Pull Day',
    duration: 55, notes: '',
    exercises: [
      { name: 'Deadlift', sets: [{ reps: 5, weight: 140, unit: 'kg' as const }, { reps: 5, weight: 150, unit: 'kg' as const }, { reps: 3, weight: 160, unit: 'kg' as const }], notes: 'PR!' },
      { name: 'Barbell Row', sets: [{ reps: 8, weight: 70, unit: 'kg' as const }, { reps: 8, weight: 75, unit: 'kg' as const }], notes: '' },
      { name: 'Pull-ups', sets: [{ reps: 10, weight: 0, unit: 'kg' as const }, { reps: 8, weight: 0, unit: 'kg' as const }], notes: '' },
    ],
  },
]

export const DEMO_MEALS = [
  { _id: 'dm1', userId: 'demo-user-001', date: today, name: 'Oats + Banana + Protein Shake', type: 'breakfast' as const, calories: 520, protein: 38, carbs: 65, fat: 12 },
  { _id: 'dm2', userId: 'demo-user-001', date: today, name: 'Chicken Rice Bowl', type: 'lunch' as const, calories: 680, protein: 45, carbs: 72, fat: 18 },
  { _id: 'dm3', userId: 'demo-user-001', date: today, name: 'Greek Yogurt + Almonds', type: 'snack' as const, calories: 220, protein: 15, carbs: 12, fat: 14 },
  { _id: 'dm4', userId: 'demo-user-001', date: today, name: 'Salmon + Sweet Potato', type: 'dinner' as const, calories: 580, protein: 42, carbs: 48, fat: 22 },
]

export const DEMO_TASKS = [
  { _id: 'dt1', userId: 'demo-user-001', title: 'Ship LifeOS v1', description: 'Deploy to production', priority: 'urgent' as const, status: 'in-progress' as const, dueDate: today, goalId: null },
  { _id: 'dt2', userId: 'demo-user-001', title: 'Write unit tests', description: 'Cover API routes', priority: 'high' as const, status: 'todo' as const, dueDate: null, goalId: null },
  { _id: 'dt3', userId: 'demo-user-001', title: 'Design landing page', description: '', priority: 'medium' as const, status: 'todo' as const, dueDate: null, goalId: null },
  { _id: 'dt4', userId: 'demo-user-001', title: 'Set up CI/CD pipeline', description: 'GitHub Actions', priority: 'medium' as const, status: 'done' as const, dueDate: null, goalId: null },
  { _id: 'dt5', userId: 'demo-user-001', title: 'Buy creatine', description: '', priority: 'low' as const, status: 'done' as const, dueDate: null, goalId: null },
]

export const DEMO_GOALS = [
  { _id: 'dg1', userId: 'demo-user-001', title: 'Bench Press 100kg', description: 'Current: 90kg', category: 'fitness', progress: 90, target: 100, unit: 'kg', deadline: '2026-06-01', status: 'active' as const },
  { _id: 'dg2', userId: 'demo-user-001', title: 'Read 24 Books', description: '2 per month', category: 'learning', progress: 7, target: 24, unit: 'books', deadline: '2026-12-31', status: 'active' as const },
  { _id: 'dg3', userId: 'demo-user-001', title: 'Ship 3 Side Projects', description: '', category: 'career', progress: 1, target: 3, unit: 'projects', deadline: '2026-12-31', status: 'active' as const },
  { _id: 'dg4', userId: 'demo-user-001', title: 'Run a 5K', description: 'Sub 25 minutes', category: 'health', progress: 100, target: 100, unit: '%', deadline: null, status: 'completed' as const },
]

export function isDemoUser(userId: string): boolean {
  return userId === 'demo-user-001'
}
