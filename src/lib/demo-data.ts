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
    _id: 'dh1', userId: 'demo-user-001', name: 'Meditate', icon: 'meditate', color: '#A855F7',
    frequency: 'daily' as const,
    completedDates: lastNDays(30).filter((_, i) => i % 2 === 0 || i < 7),
    streak: 7, bestStreak: 12,
  },
  {
    _id: 'dh2', userId: 'demo-user-001', name: 'Read 30min', icon: 'book', color: '#3B82F6',
    frequency: 'daily' as const,
    completedDates: lastNDays(30).filter((_, i) => i < 14 || i % 3 === 0),
    streak: 14, bestStreak: 21,
  },
  {
    _id: 'dh3', userId: 'demo-user-001', name: 'Workout', icon: 'dumbbell', color: '#22C55E',
    frequency: 'daily' as const,
    completedDates: lastNDays(30).filter((_, i) => i < 5 || i % 2 === 0),
    streak: 5, bestStreak: 18,
  },
  {
    _id: 'dh4', userId: 'demo-user-001', name: 'Drink 3L Water', icon: 'droplets', color: '#06B6D4',
    frequency: 'daily' as const,
    completedDates: lastNDays(30).filter((_, i) => i < 10),
    streak: 10, bestStreak: 10,
  },
  {
    _id: 'dh5', userId: 'demo-user-001', name: 'No Social Media', icon: 'ban', color: '#EF4444',
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

// ─── BODY TRACKER DEMO ─────────────────────────────

export const DEMO_BODY_LOGS = [
  { _id: 'db1', userId: 'demo-user-001', date: today, weight: 78.5, bodyFat: 15.2, measurements: { chest: 102, waist: 82, hips: 96, arms: 36, thighs: 58 }, notes: 'Morning weigh-in' },
  { _id: 'db2', userId: 'demo-user-001', date: (() => { const d = new Date(); d.setDate(d.getDate() - 7); return toISODate(d) })(), weight: 79.1, bodyFat: 15.5, measurements: { chest: 101, waist: 83, hips: 96, arms: 35.5, thighs: 57.5 }, notes: '' },
  { _id: 'db3', userId: 'demo-user-001', date: (() => { const d = new Date(); d.setDate(d.getDate() - 14); return toISODate(d) })(), weight: 79.8, bodyFat: 16.0, measurements: { chest: 100, waist: 84, hips: 97, arms: 35, thighs: 57 }, notes: 'Started cutting' },
  { _id: 'db4', userId: 'demo-user-001', date: (() => { const d = new Date(); d.setDate(d.getDate() - 21); return toISODate(d) })(), weight: 80.5, bodyFat: 16.8, measurements: { chest: 100, waist: 85, hips: 97, arms: 35, thighs: 57 }, notes: '' },
  { _id: 'db5', userId: 'demo-user-001', date: (() => { const d = new Date(); d.setDate(d.getDate() - 28); return toISODate(d) })(), weight: 81.2, bodyFat: 17.1, measurements: { chest: 99, waist: 86, hips: 98, arms: 34.5, thighs: 56.5 }, notes: '' },
]

// ─── SLEEP TRACKER DEMO ────────────────────────────

export const DEMO_SLEEP_LOGS = [
  { _id: 'ds1', userId: 'demo-user-001', date: today, bedtime: '23:00', waketime: '06:30', hours: 7.5, quality: 4, notes: 'Good sleep' },
  { _id: 'ds2', userId: 'demo-user-001', date: yesterday, bedtime: '23:30', waketime: '07:00', hours: 7.5, quality: 3, notes: '' },
  { _id: 'ds3', userId: 'demo-user-001', date: twoDaysAgo, bedtime: '01:00', waketime: '07:30', hours: 6.5, quality: 2, notes: 'Stayed up coding' },
  { _id: 'ds4', userId: 'demo-user-001', date: (() => { const d = new Date(); d.setDate(d.getDate() - 3); return toISODate(d) })(), bedtime: '22:30', waketime: '06:00', hours: 7.5, quality: 5, notes: 'Best sleep in weeks' },
  { _id: 'ds5', userId: 'demo-user-001', date: (() => { const d = new Date(); d.setDate(d.getDate() - 4); return toISODate(d) })(), bedtime: '23:15', waketime: '06:30', hours: 7.25, quality: 3, notes: '' },
  { _id: 'ds6', userId: 'demo-user-001', date: (() => { const d = new Date(); d.setDate(d.getDate() - 5); return toISODate(d) })(), bedtime: '00:00', waketime: '07:00', hours: 7, quality: 3, notes: '' },
  { _id: 'ds7', userId: 'demo-user-001', date: (() => { const d = new Date(); d.setDate(d.getDate() - 6); return toISODate(d) })(), bedtime: '22:00', waketime: '05:30', hours: 7.5, quality: 4, notes: 'Early gym' },
]

// ─── NOTES DEMO ─────────────────────────────────────

export const DEMO_NOTES = [
  { _id: 'dn1', userId: 'demo-user-001', title: 'Workout Programming', content: '## Push/Pull/Legs Split\\n\\n**Push Day:**\\n- Bench Press 4x8\\n- OHP 3x10\\n- Incline DB 3x10\\n- Lateral Raise 3x15\\n- Tricep Pushdown 3x12\\n\\n**Pull Day:**\\n- Deadlift 3x5\\n- Barbell Row 3x8\\n- Pull-ups 3x max\\n- Face Pulls 3x15\\n- Bicep Curls 3x12\\n\\n**Leg Day:**\\n- Squat 4x6\\n- RDL 3x10\\n- Leg Press 3x12\\n- Leg Curl 3x12\\n- Calf Raises 4x15', folder: 'Fitness', tags: ['gym', 'programming'], pinned: true, createdAt: twoDaysAgo, updatedAt: today },
  { _id: 'dn2', userId: 'demo-user-001', title: 'Book Notes: Atomic Habits', content: '## Key Takeaways\\n\\n1. **1% better every day** — Small changes compound\\n2. **Identity-based habits** — Focus on who you want to become\\n3. **4 Laws of Behavior Change:**\\n   - Make it obvious\\n   - Make it attractive\\n   - Make it easy\\n   - Make it satisfying\\n4. **Habit stacking** — Link new habits to existing ones\\n5. **Environment design** — Shape your space for success', folder: 'Reading', tags: ['books', 'habits', 'notes'], pinned: false, createdAt: yesterday, updatedAt: yesterday },
  { _id: 'dn3', userId: 'demo-user-001', title: 'Project Ideas', content: '- LifeOS mobile app (React Native)\\n- AI meal planner tool\\n- Habit tracker CLI\\n- Portfolio v3 redesign\\n- Open source gym tracker', folder: 'Ideas', tags: ['projects', 'coding'], pinned: true, createdAt: twoDaysAgo, updatedAt: today },
  { _id: 'dn4', userId: 'demo-user-001', title: 'Meal Prep Recipes', content: '## Quick Meals\\n\\n**Chicken Rice Bowl:** 680cal, 45P/72C/18F\\n**Overnight Oats:** 450cal, 30P/55C/12F\\n**Salmon Sweet Potato:** 580cal, 42P/48C/22F\\n**Tuna Wrap:** 420cal, 38P/35C/14F', folder: 'Fitness', tags: ['diet', 'recipes'], pinned: false, createdAt: twoDaysAgo, updatedAt: twoDaysAgo },
]

// ─── QUICK CAPTURES DEMO ────────────────────────────

export const DEMO_CAPTURES = [
  { _id: 'dc1', userId: 'demo-user-001', text: 'Try creatine monohydrate 5g daily', type: 'idea' as const, processed: false, createdAt: today },
  { _id: 'dc2', userId: 'demo-user-001', text: 'Look into sleep tracking app integration', type: 'todo' as const, processed: false, createdAt: today },
  { _id: 'dc3', userId: 'demo-user-001', text: 'Focus on compound movements, reduce isolation work', type: 'thought' as const, processed: false, createdAt: yesterday },
  { _id: 'dc4', userId: 'demo-user-001', text: 'Schedule dentist appointment', type: 'reminder' as const, processed: true, createdAt: twoDaysAgo },
  { _id: 'dc5', userId: 'demo-user-001', text: 'Read about intermittent fasting protocols', type: 'idea' as const, processed: false, createdAt: twoDaysAgo },
]

// ─── QUOTES ─────────────────────────────────────────

export const MOTIVATIONAL_QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "We are what we repeatedly do. Excellence is not an act, but a habit.", author: "Aristotle" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Your body can stand almost anything. It's your mind that you have to convince.", author: "David Goggins" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "It's not about having time, it's about making time.", author: "Unknown" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Hard choices, easy life. Easy choices, hard life.", author: "Jerzy Gregorek" },
  { text: "You don't have to be extreme, just consistent.", author: "Unknown" },
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
  { text: "Progress, not perfection.", author: "Unknown" },
]

// ─── EXPENSES DEMO ──────────────────────────────────

export const DEMO_EXPENSES = [
  { _id: 'de1', userId: 'demo-user-001', date: today, amount: 12.50, category: 'food' as const, description: 'Lunch at cafe', recurring: false },
  { _id: 'de2', userId: 'demo-user-001', date: today, amount: 45.00, category: 'transport' as const, description: 'Monthly metro card', recurring: true },
  { _id: 'de3', userId: 'demo-user-001', date: yesterday, amount: 29.99, category: 'entertainment' as const, description: 'Movie tickets', recurring: false },
  { _id: 'de4', userId: 'demo-user-001', date: yesterday, amount: 85.00, category: 'shopping' as const, description: 'Gym shoes', recurring: false },
  { _id: 'de5', userId: 'demo-user-001', date: twoDaysAgo, amount: 120.00, category: 'bills' as const, description: 'Internet bill', recurring: true },
  { _id: 'de6', userId: 'demo-user-001', date: twoDaysAgo, amount: 8.50, category: 'food' as const, description: 'Coffee + snack', recurring: false },
  { _id: 'de7', userId: 'demo-user-001', date: (() => { const d = new Date(); d.setDate(d.getDate() - 3); return toISODate(d) })(), amount: 35.00, category: 'health' as const, description: 'Supplements', recurring: false },
  { _id: 'de8', userId: 'demo-user-001', date: (() => { const d = new Date(); d.setDate(d.getDate() - 4); return toISODate(d) })(), amount: 15.99, category: 'education' as const, description: 'Udemy course', recurring: false },
]

// ─── BOOKS DEMO ─────────────────────────────────────

export const DEMO_BOOKS = [
  { _id: 'dbk1', userId: 'demo-user-001', title: 'Atomic Habits', author: 'James Clear', status: 'completed' as const, rating: 5, pagesRead: 320, totalPages: 320, notes: 'Life-changing. Identity-based habits concept is gold.', startDate: '2026-01-15', finishDate: '2026-02-10' },
  { _id: 'dbk2', userId: 'demo-user-001', title: 'Deep Work', author: 'Cal Newport', status: 'reading' as const, rating: 0, pagesRead: 145, totalPages: 296, notes: 'Great insights on focus and productivity.', startDate: '2026-03-01', finishDate: null },
  { _id: 'dbk3', userId: 'demo-user-001', title: 'The Pragmatic Programmer', author: 'Andy Hunt', status: 'reading' as const, rating: 0, pagesRead: 89, totalPages: 352, notes: '', startDate: '2026-03-10', finishDate: null },
  { _id: 'dbk4', userId: 'demo-user-001', title: 'Meditations', author: 'Marcus Aurelius', status: 'want-to-read' as const, rating: 0, pagesRead: 0, totalPages: 256, notes: '', startDate: null, finishDate: null },
  { _id: 'dbk5', userId: 'demo-user-001', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', status: 'want-to-read' as const, rating: 0, pagesRead: 0, totalPages: 499, notes: '', startDate: null, finishDate: null },
  { _id: 'dbk6', userId: 'demo-user-001', title: "Can't Hurt Me", author: 'David Goggins', status: 'completed' as const, rating: 4, pagesRead: 364, totalPages: 364, notes: 'Raw and motivational.', startDate: '2025-12-01', finishDate: '2025-12-28' },
]

// ─── WATER DEMO ─────────────────────────────────────

export const DEMO_WATER_LOGS = [
  { _id: 'dwl1', userId: 'demo-user-001', date: today, glasses: 5, goal: 8 },
  { _id: 'dwl2', userId: 'demo-user-001', date: yesterday, glasses: 8, goal: 8 },
  { _id: 'dwl3', userId: 'demo-user-001', date: twoDaysAgo, glasses: 6, goal: 8 },
  { _id: 'dwl4', userId: 'demo-user-001', date: (() => { const d = new Date(); d.setDate(d.getDate() - 3); return toISODate(d) })(), glasses: 7, goal: 8 },
  { _id: 'dwl5', userId: 'demo-user-001', date: (() => { const d = new Date(); d.setDate(d.getDate() - 4); return toISODate(d) })(), glasses: 8, goal: 8 },
  { _id: 'dwl6', userId: 'demo-user-001', date: (() => { const d = new Date(); d.setDate(d.getDate() - 5); return toISODate(d) })(), glasses: 4, goal: 8 },
  { _id: 'dwl7', userId: 'demo-user-001', date: (() => { const d = new Date(); d.setDate(d.getDate() - 6); return toISODate(d) })(), glasses: 9, goal: 8 },
]

// ─── BOOKMARKS DEMO ─────────────────────────────────

export const DEMO_BOOKMARKS = [
  { _id: 'dbm1', userId: 'demo-user-001', url: 'https://nextjs.org/docs', title: 'Next.js Documentation', description: 'Official Next.js docs', folder: 'Dev', tags: ['nextjs', 'docs'], favicon: '', createdAt: today },
  { _id: 'dbm2', userId: 'demo-user-001', url: 'https://tailwindcss.com', title: 'Tailwind CSS', description: 'Utility-first CSS framework', folder: 'Dev', tags: ['css', 'tailwind'], favicon: '', createdAt: today },
  { _id: 'dbm3', userId: 'demo-user-001', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Jeff Nippard Training Science', description: 'Evidence-based training videos', folder: 'Fitness', tags: ['gym', 'training'], favicon: '', createdAt: yesterday },
  { _id: 'dbm4', userId: 'demo-user-001', url: 'https://hubermanlab.com', title: 'Huberman Lab', description: 'Science-based health protocols', folder: 'Health', tags: ['health', 'science'], favicon: '', createdAt: twoDaysAgo },
  { _id: 'dbm5', userId: 'demo-user-001', url: 'https://github.com', title: 'GitHub', description: 'Code hosting platform', folder: 'Dev', tags: ['git', 'code'], favicon: '', createdAt: twoDaysAgo },
]

// ─── GRATITUDE DEMO ─────────────────────────────────

export const DEMO_GRATITUDE = [
  { _id: 'dgr1', userId: 'demo-user-001', date: today, items: ['Crushed my workout', 'Had a productive coding session', 'Good weather for a walk'], highlight: 'Hit a new deadlift PR', mood: 4 },
  { _id: 'dgr2', userId: 'demo-user-001', date: yesterday, items: ['Morning meditation felt deep', 'Healthy lunch', 'Good conversation with a friend'], highlight: 'Reconnected with old friend', mood: 4 },
  { _id: 'dgr3', userId: 'demo-user-001', date: twoDaysAgo, items: ['Slept well', 'Finished a book chapter'], highlight: 'Learning something new', mood: 3 },
]

// ─── PROJECTS DEMO ──────────────────────────────────

export const DEMO_PROJECTS = [
  { _id: 'dp1', userId: 'demo-user-001', name: 'LifeOS App', description: 'Full-stack personal life management app', status: 'active' as const, color: '#e8d5b7', progress: 75, deadline: '2026-06-01', tasks: [{ text: 'Build core features', done: true }, { text: 'Add body tracker', done: true }, { text: 'Add sleep tracker', done: true }, { text: 'Mobile responsive', done: false }, { text: 'Deploy to production', done: false }], createdAt: '2026-01-01', updatedAt: today },
  { _id: 'dp2', userId: 'demo-user-001', name: 'Portfolio v3', description: 'Redesign personal portfolio site', status: 'active' as const, color: '#3B82F6', progress: 30, deadline: '2026-04-15', tasks: [{ text: 'Design mockups', done: true }, { text: 'Build components', done: false }, { text: 'Add projects section', done: false }], createdAt: '2026-02-15', updatedAt: yesterday },
  { _id: 'dp3', userId: 'demo-user-001', name: 'Learn Rust', description: 'Complete the Rust book and build a CLI tool', status: 'on-hold' as const, color: '#EF4444', progress: 15, deadline: null, tasks: [{ text: 'Read chapters 1-5', done: true }, { text: 'Build hello world CLI', done: false }, { text: 'Build file organizer', done: false }], createdAt: '2026-01-20', updatedAt: twoDaysAgo },
]

// ─── FLASHCARDS DEMO ────────────────────────────────

export const DEMO_FLASHCARDS = [
  { _id: 'df1', userId: 'demo-user-001', deck: 'JavaScript', front: 'What is a closure?', back: 'A closure is a function that has access to variables in its outer (enclosing) lexical scope, even after the outer function has returned.', difficulty: 'medium' as const, nextReview: today, timesReviewed: 3, timesCorrect: 2 },
  { _id: 'df2', userId: 'demo-user-001', deck: 'JavaScript', front: 'Difference between == and ===?', back: '== checks value equality with type coercion. === checks both value and type without coercion (strict equality).', difficulty: 'easy' as const, nextReview: today, timesReviewed: 5, timesCorrect: 5 },
  { _id: 'df3', userId: 'demo-user-001', deck: 'JavaScript', front: 'What is the event loop?', back: 'The event loop is a mechanism that allows JavaScript to perform non-blocking operations by offloading operations to the system kernel whenever possible, then processing callbacks when the call stack is empty.', difficulty: 'hard' as const, nextReview: yesterday, timesReviewed: 2, timesCorrect: 1 },
  { _id: 'df4', userId: 'demo-user-001', deck: 'React', front: 'What are React hooks?', back: 'Hooks are functions that let you use state and other React features in functional components. Common hooks: useState, useEffect, useContext, useRef, useMemo.', difficulty: 'easy' as const, nextReview: today, timesReviewed: 4, timesCorrect: 4 },
  { _id: 'df5', userId: 'demo-user-001', deck: 'React', front: 'What is the virtual DOM?', back: 'A lightweight copy of the actual DOM kept in memory. React compares it with the previous version (diffing) and only updates the real DOM where changes occurred (reconciliation).', difficulty: 'medium' as const, nextReview: yesterday, timesReviewed: 3, timesCorrect: 2 },
  { _id: 'df6', userId: 'demo-user-001', deck: 'System Design', front: 'What is horizontal vs vertical scaling?', back: 'Vertical: adding more power to existing machine. Horizontal: adding more machines. Horizontal is generally preferred for distributed systems.', difficulty: 'medium' as const, nextReview: today, timesReviewed: 1, timesCorrect: 1 },
]

// ─── WISHLIST DEMO ──────────────────────────────────

export const DEMO_WISHLIST = [
  { _id: 'dw1w', userId: 'demo-user-001', name: 'MacBook Pro M4', category: 'buy' as const, priority: 'high' as const, estimatedCost: 2499, url: '', notes: 'Need for development', completed: false, createdAt: today },
  { _id: 'dw2w', userId: 'demo-user-001', name: 'Japan Trip', category: 'travel' as const, priority: 'medium' as const, estimatedCost: 3000, url: '', notes: 'Tokyo, Kyoto, Osaka - 2 weeks', completed: false, createdAt: yesterday },
  { _id: 'dw3w', userId: 'demo-user-001', name: 'Learn Piano', category: 'learn' as const, priority: 'low' as const, estimatedCost: 200, url: '', notes: 'Start with online lessons', completed: false, createdAt: twoDaysAgo },
  { _id: 'dw4w', userId: 'demo-user-001', name: 'Skydiving', category: 'experience' as const, priority: 'medium' as const, estimatedCost: 250, url: '', notes: 'Bucket list item', completed: false, createdAt: twoDaysAgo },
  { _id: 'dw5w', userId: 'demo-user-001', name: 'Standing Desk', category: 'buy' as const, priority: 'high' as const, estimatedCost: 450, url: '', notes: 'For home office setup', completed: true, createdAt: twoDaysAgo },
]
