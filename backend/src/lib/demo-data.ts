import { toISODate } from './utils'

const today = toISODate()
const yesterday = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return toISODate(d) })()
const twoDaysAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 2); return toISODate(d) })()

function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i); return toISODate(d)
  })
}

export function isDemoUser(userId: string): boolean {
  return userId === 'demo-user-001'
}

export const DEMO_HABITS = [
  { _id: 'dh1', userId: 'demo-user-001', name: 'Meditate', icon: 'meditate', color: '#A855F7', frequency: 'daily' as const, completedDates: lastNDays(30).filter((_, i) => i % 2 === 0 || i < 7), streak: 7, bestStreak: 12 },
  { _id: 'dh2', userId: 'demo-user-001', name: 'Read 30min', icon: 'book', color: '#3B82F6', frequency: 'daily' as const, completedDates: lastNDays(30).filter((_, i) => i < 14 || i % 3 === 0), streak: 14, bestStreak: 21 },
  { _id: 'dh3', userId: 'demo-user-001', name: 'Workout', icon: 'dumbbell', color: '#22C55E', frequency: 'daily' as const, completedDates: lastNDays(30).filter((_, i) => i < 5 || i % 2 === 0), streak: 5, bestStreak: 18 },
  { _id: 'dh4', userId: 'demo-user-001', name: 'Drink 3L Water', icon: 'droplets', color: '#06B6D4', frequency: 'daily' as const, completedDates: lastNDays(30).filter((_, i) => i < 10), streak: 10, bestStreak: 10 },
  { _id: 'dh5', userId: 'demo-user-001', name: 'No Social Media', icon: 'ban', color: '#EF4444', frequency: 'daily' as const, completedDates: lastNDays(30).filter((_, i) => i < 3 || (i > 5 && i < 9)), streak: 3, bestStreak: 4 },
]

export const DEMO_JOURNAL = [
  { _id: 'dj1', userId: 'demo-user-001', date: today, title: 'Momentum is building', mood: 4, content: '<p>Great day. Hit the gym early, crushed a deadlift PR.</p>', tags: ['gym', 'productivity', 'wins'] },
  { _id: 'dj2', userId: 'demo-user-001', date: yesterday, title: 'Slow but steady', mood: 3, content: '<p>Decent day. Finished the API integration.</p>', tags: ['coding', 'habits'] },
  { _id: 'dj3', userId: 'demo-user-001', date: twoDaysAgo, title: 'Reset day', mood: 2, content: '<p>Didn\'t sleep well. Skipped the gym.</p>', tags: ['reflection', 'health'] },
]

export const DEMO_WORKOUTS = [
  { _id: 'dw1', userId: 'demo-user-001', date: today, name: 'Push Day', duration: 65, notes: 'Felt strong today', exercises: [
    { name: 'Bench Press', sets: [{ reps: 8, weight: 80, unit: 'kg' as const }, { reps: 8, weight: 85, unit: 'kg' as const }, { reps: 6, weight: 90, unit: 'kg' as const }], notes: '' },
    { name: 'Overhead Press', sets: [{ reps: 10, weight: 40, unit: 'kg' as const }, { reps: 8, weight: 45, unit: 'kg' as const }], notes: '' },
  ]},
  { _id: 'dw2', userId: 'demo-user-001', date: twoDaysAgo, name: 'Pull Day', duration: 55, notes: '', exercises: [
    { name: 'Deadlift', sets: [{ reps: 5, weight: 140, unit: 'kg' as const }, { reps: 5, weight: 150, unit: 'kg' as const }, { reps: 3, weight: 160, unit: 'kg' as const }], notes: 'PR!' },
    { name: 'Barbell Row', sets: [{ reps: 8, weight: 70, unit: 'kg' as const }, { reps: 8, weight: 75, unit: 'kg' as const }], notes: '' },
  ]},
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

export const DEMO_BODY_LOGS = [
  { _id: 'db1', userId: 'demo-user-001', date: today, weight: 78.5, bodyFat: 15.2, measurements: { chest: 102, waist: 82, hips: 96, arms: 36, thighs: 58 }, notes: 'Morning weigh-in' },
  { _id: 'db2', userId: 'demo-user-001', date: (() => { const d = new Date(); d.setDate(d.getDate() - 7); return toISODate(d) })(), weight: 79.1, bodyFat: 15.5, measurements: { chest: 101, waist: 83 }, notes: '' },
]

export const DEMO_SLEEP_LOGS = [
  { _id: 'ds1', userId: 'demo-user-001', date: today, bedtime: '23:00', waketime: '06:30', hours: 7.5, quality: 4, notes: 'Good sleep' },
  { _id: 'ds2', userId: 'demo-user-001', date: yesterday, bedtime: '23:30', waketime: '07:00', hours: 7.5, quality: 3, notes: '' },
  { _id: 'ds3', userId: 'demo-user-001', date: twoDaysAgo, bedtime: '01:00', waketime: '07:30', hours: 6.5, quality: 2, notes: 'Stayed up coding' },
]

export const DEMO_NOTES = [
  { _id: 'dn1', userId: 'demo-user-001', title: 'Workout Programming', content: '## Push/Pull/Legs Split', folder: 'Fitness', tags: ['gym', 'programming'], pinned: true, createdAt: twoDaysAgo, updatedAt: today },
  { _id: 'dn2', userId: 'demo-user-001', title: 'Book Notes: Atomic Habits', content: '## Key Takeaways', folder: 'Reading', tags: ['books', 'habits', 'notes'], pinned: false, createdAt: yesterday, updatedAt: yesterday },
]

export const DEMO_CAPTURES = [
  { _id: 'dc1', userId: 'demo-user-001', text: 'Try creatine monohydrate 5g daily', type: 'idea' as const, processed: false, createdAt: today },
  { _id: 'dc2', userId: 'demo-user-001', text: 'Look into sleep tracking app integration', type: 'todo' as const, processed: false, createdAt: today },
]

export const DEMO_EXPENSES = [
  { _id: 'de1', userId: 'demo-user-001', date: today, amount: 12.50, category: 'food' as const, description: 'Lunch at cafe', recurring: false },
  { _id: 'de2', userId: 'demo-user-001', date: today, amount: 45.00, category: 'transport' as const, description: 'Monthly metro card', recurring: true },
  { _id: 'de3', userId: 'demo-user-001', date: yesterday, amount: 29.99, category: 'entertainment' as const, description: 'Movie tickets', recurring: false },
]

export const DEMO_BOOKS = [
  { _id: 'dbk1', userId: 'demo-user-001', title: 'Atomic Habits', author: 'James Clear', status: 'completed' as const, rating: 5, pagesRead: 320, totalPages: 320, notes: 'Life-changing.', startDate: '2026-01-15', finishDate: '2026-02-10' },
  { _id: 'dbk2', userId: 'demo-user-001', title: 'Deep Work', author: 'Cal Newport', status: 'reading' as const, rating: 0, pagesRead: 145, totalPages: 296, notes: '', startDate: '2026-03-01', finishDate: null },
]

export const DEMO_WATER_LOGS = [
  { _id: 'dwl1', userId: 'demo-user-001', date: today, glasses: 5, goal: 8 },
  { _id: 'dwl2', userId: 'demo-user-001', date: yesterday, glasses: 8, goal: 8 },
  { _id: 'dwl3', userId: 'demo-user-001', date: twoDaysAgo, glasses: 6, goal: 8 },
]

export const DEMO_BOOKMARKS = [
  { _id: 'dbm1', userId: 'demo-user-001', url: 'https://nextjs.org/docs', title: 'Next.js Documentation', description: 'Official Next.js docs', folder: 'Dev', tags: ['nextjs', 'docs'], favicon: '', createdAt: today },
  { _id: 'dbm2', userId: 'demo-user-001', url: 'https://tailwindcss.com', title: 'Tailwind CSS', description: 'Utility-first CSS framework', folder: 'Dev', tags: ['css', 'tailwind'], favicon: '', createdAt: today },
]

export const DEMO_GRATITUDE = [
  { _id: 'dgr1', userId: 'demo-user-001', date: today, items: ['Crushed my workout', 'Had a productive coding session', 'Good weather for a walk'], highlight: 'Hit a new deadlift PR', mood: 4 },
  { _id: 'dgr2', userId: 'demo-user-001', date: yesterday, items: ['Morning meditation felt deep', 'Healthy lunch', 'Good conversation with a friend'], highlight: 'Reconnected with old friend', mood: 4 },
]

export const DEMO_PROJECTS = [
  { _id: 'dp1', userId: 'demo-user-001', name: 'LifeOS App', description: 'Full-stack personal life management app', status: 'active' as const, color: '#e8d5b7', progress: 75, deadline: '2026-06-01', tasks: [{ text: 'Build core features', done: true }, { text: 'Deploy to production', done: false }], createdAt: '2026-01-01', updatedAt: today },
]

export const DEMO_FLASHCARDS = [
  { _id: 'df1', userId: 'demo-user-001', deck: 'JavaScript', front: 'What is a closure?', back: 'A function that has access to variables in its outer lexical scope.', difficulty: 'medium' as const, nextReview: today, timesReviewed: 3, timesCorrect: 2 },
  { _id: 'df2', userId: 'demo-user-001', deck: 'JavaScript', front: 'Difference between == and ===?', back: '== checks value with type coercion. === is strict equality.', difficulty: 'easy' as const, nextReview: today, timesReviewed: 5, timesCorrect: 5 },
]

export const DEMO_WISHLIST = [
  { _id: 'dw1w', userId: 'demo-user-001', name: 'MacBook Pro M4', category: 'buy' as const, priority: 'high' as const, estimatedCost: 2499, url: '', notes: 'Need for development', completed: false, createdAt: today },
  { _id: 'dw2w', userId: 'demo-user-001', name: 'Japan Trip', category: 'travel' as const, priority: 'medium' as const, estimatedCost: 3000, url: '', notes: 'Tokyo, Kyoto, Osaka', completed: false, createdAt: yesterday },
]
