import { create } from 'zustand'
import { toISODate } from '@/lib/utils'

const API_BASE = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000')

// ─── TYPES ─────────────────────────────────────────

export interface HabitData {
  _id: string
  name: string
  icon: string
  color: string
  frequency: 'daily' | 'weekly'
  completedDates: string[]
  streak: number
  bestStreak: number
}

export interface JournalData {
  _id: string
  date: string
  title: string
  content: string
  mood: number
  energy: number
  highlights: string
  gratitude: string[]
  improvements: string
  tags: string[]
}

export interface ExerciseSet {
  reps: number
  weight: number
  unit: 'kg' | 'lbs'
}

export interface Exercise {
  name: string
  sets: ExerciseSet[]
  notes: string
}

export interface WorkoutData {
  _id: string
  date: string
  name: string
  exercises: Exercise[]
  duration: number
  notes: string
}

export interface MealData {
  _id: string
  date: string
  name: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
}

export interface TaskData {
  _id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'todo' | 'in-progress' | 'done'
  dueDate: string | null
  goalId: string | null
}

export interface GoalData {
  _id: string
  title: string
  description: string
  category: string
  progress: number
  target: number
  unit: string
  deadline: string | null
  status: 'active' | 'completed' | 'paused'
}

export interface UserData {
  _id: string
  email: string
  name: string
  xp: number
  level: number
}

// ─── AUTH STORE ─────────────────────────────────────

interface AuthState {
  user: UserData | null
  token: string | null
  isLoading: boolean
  setUser: (user: UserData | null) => void
  setToken: (token: string | null) => void
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem('lifeos-token', token)
    else localStorage.removeItem('lifeos-token')
    set({ token })
  },
  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const url = `${API_BASE}/api/auth/login`
      console.log('[LifeOS] Login request to:', url)
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      localStorage.setItem('lifeos-token', data.token)
      set({ user: data.user, token: data.token, isLoading: false })
    } catch (err: any) {
      console.error('[LifeOS] Login error:', err?.message, '| API_BASE:', API_BASE)
      set({ isLoading: false })
      throw err
    }
  },
  register: async (name, email, password) => {
    set({ isLoading: true })
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      localStorage.setItem('lifeos-token', data.token)
      set({ user: data.user, token: data.token, isLoading: false })
    } catch (err) {
      set({ isLoading: false })
      throw err
    }
  },
  logout: () => {
    localStorage.removeItem('lifeos-token')
    set({ user: null, token: null })
  },
}))

// ─── APP STORE ──────────────────────────────────────

interface AppState {
  activeView: string
  commandPaletteOpen: boolean
  selectedDate: string
  sidebarCollapsed: boolean
  focusMode: boolean
  accentColor: string
  chatOpen: boolean
  setActiveView: (view: string) => void
  setCommandPaletteOpen: (open: boolean) => void
  setSelectedDate: (date: string) => void
  toggleSidebar: () => void
  toggleFocusMode: () => void
  setAccentColor: (color: string) => void
  toggleChat: () => void
  setChatOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'dashboard',
  commandPaletteOpen: false,
  selectedDate: toISODate(),
  sidebarCollapsed: false,
  focusMode: false,
  accentColor: '#e8d5b7',
  chatOpen: false,
  setActiveView: (view) => set({ activeView: view }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  setAccentColor: (color) => {
    document.documentElement.style.setProperty('--accent-dynamic', color)
    set({ accentColor: color })
    useSettingsStore.getState().updateSettings({ accentColor: color })
  },
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  setChatOpen: (open) => set({ chatOpen: open }),
}))

// ─── API HELPER ─────────────────────────────────────

async function api(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('lifeos-token')
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  let data
  try {
    data = await res.json()
  } catch {
    throw new Error('Invalid server response')
  }
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

// ─── SETTINGS STORE (DB-backed) ─────────────────────

export const DEFAULT_GOALS = { calories: 2200, protein: 150, carbs: 250, fat: 70, water: 8, sleep: 8, steps: 10000, workoutsPerWeek: 4 }

interface SettingsData {
  accentColor: string
  goals: typeof DEFAULT_GOALS
  aiProvider: string
  aiModels: Record<string, string>
  aiKeys: Record<string, string>
  lastBackup: string | null
}

interface SettingsState extends SettingsData {
  loaded: boolean
  fetchSettings: () => Promise<void>
  updateSettings: (patch: Partial<SettingsData>) => Promise<void>
  getAiConfig: () => { provider: string; model: string; apiKey: string }
}

const SETTINGS_DEFAULTS: SettingsData = {
  accentColor: '#e8d5b7',
  goals: DEFAULT_GOALS,
  aiProvider: 'openai',
  aiModels: {},
  aiKeys: {},
  lastBackup: null,
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...SETTINGS_DEFAULTS,
  loaded: false,
  fetchSettings: async () => {
    try {
      const data = await api('/settings')
      set({ ...SETTINGS_DEFAULTS, ...data, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },
  updateSettings: async (patch) => {
    set(patch as any)
    try {
      await api('/settings', { method: 'PUT', body: JSON.stringify(patch) })
    } catch {
      // revert on failure — refetch
      get().fetchSettings()
    }
  },
  getAiConfig: () => {
    const s = get()
    const provider = s.aiProvider || 'openai'
    const model = s.aiModels[provider] || ''
    const apiKey = s.aiKeys[provider] || ''
    return { provider, model, apiKey }
  },
}))

// ─── HABITS STORE ───────────────────────────────────

interface HabitsState {
  habits: HabitData[]
  isLoading: boolean
  fetchHabits: () => Promise<void>
  addHabit: (habit: Partial<HabitData>) => Promise<void>
  toggleHabit: (id: string, date: string) => Promise<void>
  deleteHabit: (id: string) => Promise<void>
}

export const useHabitsStore = create<HabitsState>((set, get) => ({
  habits: [],
  isLoading: false,
  fetchHabits: async () => {
    set({ isLoading: true })
    try {
      const data = await api('/habits')
      set({ habits: data })
    } finally {
      set({ isLoading: false })
    }
  },
  addHabit: async (habit) => {
    const data = await api('/habits', { method: 'POST', body: JSON.stringify(habit) })
    set({ habits: [...get().habits, data] })
  },
  toggleHabit: async (id, date) => {
    const data = await api(`/habits/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ date }) })
    set({ habits: get().habits.map((h) => (h._id === id ? data : h)) })
  },
  deleteHabit: async (id) => {
    await api(`/habits/${id}`, { method: 'DELETE' })
    set({ habits: get().habits.filter((h) => h._id !== id) })
  },
}))

// ─── JOURNAL STORE ──────────────────────────────────

interface JournalState {
  entries: JournalData[]
  isLoading: boolean
  fetchEntries: () => Promise<void>
  saveEntry: (entry: Partial<JournalData>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: [],
  isLoading: false,
  fetchEntries: async () => {
    set({ isLoading: true })
    try {
      const data = await api('/journal')
      set({ entries: data })
    } finally {
      set({ isLoading: false })
    }
  },
  saveEntry: async (entry) => {
    const data = await api('/journal', { method: 'POST', body: JSON.stringify(entry) })
    const existing = get().entries.find((e) => e._id === data._id)
    if (existing) {
      set({ entries: get().entries.map((e) => (e._id === data._id ? data : e)) })
    } else {
      set({ entries: [data, ...get().entries] })
    }
  },
  deleteEntry: async (id) => {
    await api(`/journal/${id}`, { method: 'DELETE' })
    set({ entries: get().entries.filter((e) => e._id !== id) })
  },
}))

// ─── WORKOUTS STORE ─────────────────────────────────

interface WorkoutsState {
  workouts: WorkoutData[]
  isLoading: boolean
  fetchWorkouts: () => Promise<void>
  addWorkout: (workout: Partial<WorkoutData>) => Promise<void>
  updateWorkout: (id: string, workout: Partial<WorkoutData>) => Promise<void>
  deleteWorkout: (id: string) => Promise<void>
}

export const useWorkoutsStore = create<WorkoutsState>((set, get) => ({
  workouts: [],
  isLoading: false,
  fetchWorkouts: async () => {
    set({ isLoading: true })
    try {
      const data = await api('/workouts')
      set({ workouts: data })
    } finally {
      set({ isLoading: false })
    }
  },
  addWorkout: async (workout) => {
    const data = await api('/workouts', { method: 'POST', body: JSON.stringify(workout) })
    set({ workouts: [data, ...get().workouts] })
  },
  updateWorkout: async (id, workout) => {
    const data = await api(`/workouts/${id}`, { method: 'PUT', body: JSON.stringify(workout) })
    set({ workouts: get().workouts.map((w) => (w._id === id ? data : w)) })
  },
  deleteWorkout: async (id) => {
    await api(`/workouts/${id}`, { method: 'DELETE' })
    set({ workouts: get().workouts.filter((w) => w._id !== id) })
  },
}))

// ─── MEALS STORE ────────────────────────────────────

interface MealsState {
  meals: MealData[]
  isLoading: boolean
  fetchMeals: (date?: string) => Promise<void>
  addMeal: (meal: Partial<MealData>) => Promise<void>
  deleteMeal: (id: string) => Promise<void>
}

export const useMealsStore = create<MealsState>((set, get) => ({
  meals: [],
  isLoading: false,
  fetchMeals: async (date) => {
    set({ isLoading: true })
    try {
      const query = date ? `?date=${date}` : ''
      const data = await api(`/meals${query}`)
      set({ meals: data })
    } finally {
      set({ isLoading: false })
    }
  },
  addMeal: async (meal) => {
    const data = await api('/meals', { method: 'POST', body: JSON.stringify(meal) })
    set({ meals: [...get().meals, data] })
  },
  deleteMeal: async (id) => {
    await api(`/meals/${id}`, { method: 'DELETE' })
    set({ meals: get().meals.filter((m) => m._id !== id) })
  },
}))

// ─── TASKS STORE ────────────────────────────────────

interface TasksState {
  tasks: TaskData[]
  isLoading: boolean
  fetchTasks: () => Promise<void>
  addTask: (task: Partial<TaskData>) => Promise<void>
  updateTask: (id: string, task: Partial<TaskData>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  isLoading: false,
  fetchTasks: async () => {
    set({ isLoading: true })
    try {
      const data = await api('/tasks')
      set({ tasks: data })
    } finally {
      set({ isLoading: false })
    }
  },
  addTask: async (task) => {
    const data = await api('/tasks', { method: 'POST', body: JSON.stringify(task) })
    set({ tasks: [...get().tasks, data] })
  },
  updateTask: async (id, task) => {
    const data = await api(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) })
    set({ tasks: get().tasks.map((t) => (t._id === id ? data : t)) })
  },
  deleteTask: async (id) => {
    await api(`/tasks/${id}`, { method: 'DELETE' })
    set({ tasks: get().tasks.filter((t) => t._id !== id) })
  },
}))

// ─── GOALS STORE ────────────────────────────────────

interface GoalsState {
  goals: GoalData[]
  isLoading: boolean
  fetchGoals: () => Promise<void>
  addGoal: (goal: Partial<GoalData>) => Promise<void>
  updateGoal: (id: string, goal: Partial<GoalData>) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  isLoading: false,
  fetchGoals: async () => {
    set({ isLoading: true })
    try {
      const data = await api('/goals')
      set({ goals: data })
    } finally {
      set({ isLoading: false })
    }
  },
  addGoal: async (goal) => {
    const data = await api('/goals', { method: 'POST', body: JSON.stringify(goal) })
    set({ goals: [...get().goals, data] })
  },
  updateGoal: async (id, goal) => {
    const data = await api(`/goals/${id}`, { method: 'PUT', body: JSON.stringify(goal) })
    set({ goals: get().goals.map((g) => (g._id === id ? data : g)) })
  },
  deleteGoal: async (id) => {
    await api(`/goals/${id}`, { method: 'DELETE' })
    set({ goals: get().goals.filter((g) => g._id !== id) })
  },
}))

// ─── TIMELINE STORE ─────────────────────────────────

export interface TimelineEvent {
  type: 'habit' | 'journal' | 'workout' | 'meal' | 'task' | 'goal'
  date: string
  title: string
  subtitle?: string
  icon: string
  color: string
  data?: Record<string, unknown>
}

interface TimelineState {
  events: TimelineEvent[]
  isLoading: boolean
  fetchTimeline: (from: string, to: string) => Promise<void>
}

export const useTimelineStore = create<TimelineState>((set) => ({
  events: [],
  isLoading: false,
  fetchTimeline: async (from, to) => {
    set({ isLoading: true })
    try {
      const data = await api(`/timeline?from=${from}&to=${to}`)
      set({ events: data })
    } finally {
      set({ isLoading: false })
    }
  },
}))

// ─── BACKUP STORE ───────────────────────────────────

interface BackupState {
  isExporting: boolean
  isImporting: boolean
  lastBackup: string | null
  exportData: () => Promise<void>
  importData: (file: File) => Promise<{ success: boolean; message: string }>
}

export const useBackupStore = create<BackupState>((set) => ({
  isExporting: false,
  isImporting: false,
  lastBackup: null,
  exportData: async () => {
    set({ isExporting: true })
    try {
      const data = await api('/backup/export')
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lifeos-backup-${toISODate()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      const now = new Date().toISOString()
      useSettingsStore.getState().updateSettings({ lastBackup: now })
      set({ lastBackup: now })
    } finally {
      set({ isExporting: false })
    }
  },
  importData: async (file: File) => {
    set({ isImporting: true })
    try {
      const text = await file.text()
      const json = JSON.parse(text)
      const result = await api('/backup/import', { method: 'POST', body: JSON.stringify(json) })
      return { success: true, message: result.message || `Imported ${result.count} records` }
    } catch (e: unknown) {
      return { success: false, message: e instanceof Error ? e.message : 'Import failed' }
    } finally {
      set({ isImporting: false })
    }
  },
}))

// ─── BODY TRACKER TYPES & STORE ─────────────────────

export interface BodyLogData {
  _id: string
  date: string
  weight?: number
  bodyFat?: number
  measurements?: {
    chest?: number
    waist?: number
    hips?: number
    arms?: number
    leftArm?: number
    rightArm?: number
    thighs?: number
    leftThigh?: number
    rightThigh?: number
    neck?: number
    shoulders?: number
    forearms?: number
    leftForearm?: number
    rightForearm?: number
    calves?: number
    leftCalf?: number
    rightCalf?: number
  }
  notes?: string
}

interface BodyTrackerState {
  logs: BodyLogData[]
  isLoading: boolean
  fetchLogs: () => Promise<void>
  addLog: (log: Partial<BodyLogData>) => Promise<void>
  deleteLog: (id: string) => Promise<void>
}

export const useBodyTrackerStore = create<BodyTrackerState>((set, get) => ({
  logs: [],
  isLoading: false,
  fetchLogs: async () => {
    set({ isLoading: true })
    try { set({ logs: await api('/body') }) } finally { set({ isLoading: false }) }
  },
  addLog: async (log) => {
    const data = await api('/body', { method: 'POST', body: JSON.stringify(log) })
    // Backend upserts by date — remove any existing entry for the same date to avoid duplicates
    const filtered = get().logs.filter(l => l.date !== data.date)
    set({ logs: [data, ...filtered] })
  },
  deleteLog: async (id) => {
    await api(`/body/${id}`, { method: 'DELETE' })
    set({ logs: get().logs.filter(l => l._id !== id) })
  },
}))

// ─── SLEEP TRACKER TYPES & STORE ────────────────────

export interface SleepLogData {
  _id: string
  date: string
  bedtime: string
  waketime: string
  hours: number
  quality: number // 1-5
  notes?: string
}

interface SleepTrackerState {
  logs: SleepLogData[]
  isLoading: boolean
  fetchLogs: () => Promise<void>
  addLog: (log: Partial<SleepLogData>) => Promise<void>
  deleteLog: (id: string) => Promise<void>
}

export const useSleepTrackerStore = create<SleepTrackerState>((set, get) => ({
  logs: [],
  isLoading: false,
  fetchLogs: async () => {
    set({ isLoading: true })
    try { set({ logs: await api('/sleep') }) } finally { set({ isLoading: false }) }
  },
  addLog: async (log) => {
    const data = await api('/sleep', { method: 'POST', body: JSON.stringify(log) })
    set({ logs: [data, ...get().logs] })
  },
  deleteLog: async (id) => {
    await api(`/sleep/${id}`, { method: 'DELETE' })
    set({ logs: get().logs.filter(l => l._id !== id) })
  },
}))

// ─── NOTES TYPES & STORE ────────────────────────────

export interface NoteData {
  _id: string
  title: string
  content: string
  folder: string
  tags: string[]
  pinned: boolean
  updatedAt: string
  createdAt: string
}

interface NotesState {
  notes: NoteData[]
  isLoading: boolean
  fetchNotes: () => Promise<void>
  saveNote: (note: Partial<NoteData>) => Promise<void>
  deleteNote: (id: string) => Promise<void>
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  isLoading: false,
  fetchNotes: async () => {
    set({ isLoading: true })
    try { set({ notes: await api('/notes') }) } finally { set({ isLoading: false }) }
  },
  saveNote: async (note) => {
    const data = await api('/notes', { method: 'POST', body: JSON.stringify(note) })
    const existing = get().notes.find(n => n._id === data._id)
    if (existing) {
      set({ notes: get().notes.map(n => n._id === data._id ? data : n) })
    } else {
      set({ notes: [data, ...get().notes] })
    }
  },
  deleteNote: async (id) => {
    await api(`/notes/${id}`, { method: 'DELETE' })
    set({ notes: get().notes.filter(n => n._id !== id) })
  },
}))

// ─── QUICK CAPTURE STORE ────────────────────────────

export interface CaptureData {
  _id: string
  text: string
  type: 'thought' | 'idea' | 'todo' | 'reminder'
  processed: boolean
  createdAt: string
}

interface CaptureState {
  items: CaptureData[]
  isLoading: boolean
  fetchCaptures: () => Promise<void>
  addCapture: (item: Partial<CaptureData>) => Promise<void>
  updateCapture: (id: string, updates: Partial<CaptureData>) => Promise<void>
  deleteCapture: (id: string) => Promise<void>
}

export const useCaptureStore = create<CaptureState>((set, get) => ({
  items: [],
  isLoading: false,
  fetchCaptures: async () => {
    set({ isLoading: true })
    try { set({ items: await api('/captures') }) } finally { set({ isLoading: false }) }
  },
  addCapture: async (item) => {
    const data = await api('/captures', { method: 'POST', body: JSON.stringify(item) })
    set({ items: [data, ...get().items] })
  },
  updateCapture: async (id, updates) => {
    const data = await api(`/captures/${id}`, { method: 'PUT', body: JSON.stringify(updates) })
    set({ items: get().items.map(i => i._id === id ? data : i) })
  },
  deleteCapture: async (id) => {
    await api(`/captures/${id}`, { method: 'DELETE' })
    set({ items: get().items.filter(i => i._id !== id) })
  },
}))

// ─── POMODORO STORE (CLIENT-ONLY) ───────────────────

interface PomodoroState {
  isRunning: boolean
  mode: 'focus' | 'break'
  timeLeft: number
  sessionsToday: number
  totalFocusMinutes: number
  startTimer: () => void
  pauseTimer: () => void
  resetTimer: () => void
  tick: () => void
  switchMode: (mode: 'focus' | 'break') => void
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
  isRunning: false,
  mode: 'focus',
  timeLeft: 25 * 60,
  sessionsToday: 0,
  totalFocusMinutes: 0,
  startTimer: () => set({ isRunning: true }),
  pauseTimer: () => set({ isRunning: false }),
  resetTimer: () => set(s => ({ isRunning: false, timeLeft: s.mode === 'focus' ? 25 * 60 : 5 * 60 })),
  tick: () => {
    const s = get()
    if (!s.isRunning || s.timeLeft <= 0) {
      if (s.timeLeft <= 0 && s.isRunning) {
        if (s.mode === 'focus') {
          set(prev => ({
            isRunning: false,
            mode: 'break',
            timeLeft: 5 * 60,
            sessionsToday: prev.sessionsToday + 1,
            totalFocusMinutes: prev.totalFocusMinutes + 25,
          }))
        } else {
          set({ isRunning: false, mode: 'focus', timeLeft: 25 * 60 })
        }
      }
      return
    }
    set({ timeLeft: s.timeLeft - 1 })
  },
  switchMode: (mode) => set({ mode, timeLeft: mode === 'focus' ? 25 * 60 : 5 * 60, isRunning: false }),
}))

// ─── EXPENSE TRACKER TYPES & STORE ──────────────────

export interface ExpenseData {
  _id: string
  date: string
  amount: number
  category: 'food' | 'transport' | 'shopping' | 'bills' | 'health' | 'entertainment' | 'education' | 'other'
  description: string
  recurring: boolean
}

interface ExpenseState {
  expenses: ExpenseData[]
  isLoading: boolean
  fetchExpenses: () => Promise<void>
  addExpense: (expense: Partial<ExpenseData>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  isLoading: false,
  fetchExpenses: async () => {
    set({ isLoading: true })
    try { set({ expenses: await api('/expenses') }) } finally { set({ isLoading: false }) }
  },
  addExpense: async (expense) => {
    const data = await api('/expenses', { method: 'POST', body: JSON.stringify(expense) })
    set({ expenses: [data, ...get().expenses] })
  },
  deleteExpense: async (id) => {
    await api(`/expenses/${id}`, { method: 'DELETE' })
    set({ expenses: get().expenses.filter(e => e._id !== id) })
  },
}))

// ─── READING LIST TYPES & STORE ─────────────────────

export interface BookData {
  _id: string
  title: string
  author: string
  status: 'reading' | 'completed' | 'want-to-read' | 'dropped'
  rating: number
  pagesRead: number
  totalPages: number
  notes: string
  startDate: string | null
  finishDate: string | null
}

interface BookState {
  books: BookData[]
  isLoading: boolean
  fetchBooks: () => Promise<void>
  addBook: (book: Partial<BookData>) => Promise<void>
  updateBook: (id: string, book: Partial<BookData>) => Promise<void>
  deleteBook: (id: string) => Promise<void>
}

export const useBookStore = create<BookState>((set, get) => ({
  books: [],
  isLoading: false,
  fetchBooks: async () => {
    set({ isLoading: true })
    try { set({ books: await api('/books') }) } finally { set({ isLoading: false }) }
  },
  addBook: async (book) => {
    const data = await api('/books', { method: 'POST', body: JSON.stringify(book) })
    set({ books: [data, ...get().books] })
  },
  updateBook: async (id, book) => {
    const data = await api(`/books/${id}`, { method: 'PUT', body: JSON.stringify(book) })
    set({ books: get().books.map(b => b._id === id ? data : b) })
  },
  deleteBook: async (id) => {
    await api(`/books/${id}`, { method: 'DELETE' })
    set({ books: get().books.filter(b => b._id !== id) })
  },
}))

// ─── WATER TRACKER TYPES & STORE ────────────────────

export interface WaterLogData {
  _id: string
  date: string
  glasses: number
  goal: number
}

interface WaterState {
  logs: WaterLogData[]
  isLoading: boolean
  fetchLogs: () => Promise<void>
  logWater: (data: Partial<WaterLogData>) => Promise<void>
}

export const useWaterStore = create<WaterState>((set, get) => ({
  logs: [],
  isLoading: false,
  fetchLogs: async () => {
    set({ isLoading: true })
    try { set({ logs: await api('/water') }) } finally { set({ isLoading: false }) }
  },
  logWater: async (data) => {
    const result = await api('/water', { method: 'POST', body: JSON.stringify(data) })
    const existing = get().logs.find(l => l.date === result.date)
    if (existing) {
      set({ logs: get().logs.map(l => l.date === result.date ? result : l) })
    } else {
      set({ logs: [result, ...get().logs] })
    }
  },
}))

// ─── BOOKMARKS TYPES & STORE ────────────────────────

export interface BookmarkData {
  _id: string
  url: string
  title: string
  description: string
  folder: string
  tags: string[]
  favicon: string
  createdAt: string
}

interface BookmarkState {
  bookmarks: BookmarkData[]
  isLoading: boolean
  fetchBookmarks: () => Promise<void>
  addBookmark: (bookmark: Partial<BookmarkData>) => Promise<void>
  deleteBookmark: (id: string) => Promise<void>
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  isLoading: false,
  fetchBookmarks: async () => {
    set({ isLoading: true })
    try { set({ bookmarks: await api('/bookmarks') }) } finally { set({ isLoading: false }) }
  },
  addBookmark: async (bookmark) => {
    const data = await api('/bookmarks', { method: 'POST', body: JSON.stringify(bookmark) })
    set({ bookmarks: [data, ...get().bookmarks] })
  },
  deleteBookmark: async (id) => {
    await api(`/bookmarks/${id}`, { method: 'DELETE' })
    set({ bookmarks: get().bookmarks.filter(b => b._id !== id) })
  },
}))

// ─── GRATITUDE TYPES & STORE ────────────────────────

export interface GratitudeData {
  _id: string
  date: string
  items: string[]
  highlight: string
  mood: number
}

interface GratitudeState {
  entries: GratitudeData[]
  isLoading: boolean
  fetchEntries: () => Promise<void>
  saveEntry: (entry: Partial<GratitudeData>) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
}

export const useGratitudeStore = create<GratitudeState>((set, get) => ({
  entries: [],
  isLoading: false,
  fetchEntries: async () => {
    set({ isLoading: true })
    try { set({ entries: await api('/gratitude') }) } finally { set({ isLoading: false }) }
  },
  saveEntry: async (entry) => {
    const data = await api('/gratitude', { method: 'POST', body: JSON.stringify(entry) })
    const existing = get().entries.find(e => e._id === data._id)
    if (existing) {
      set({ entries: get().entries.map(e => e._id === data._id ? data : e) })
    } else {
      set({ entries: [data, ...get().entries] })
    }
  },
  deleteEntry: async (id) => {
    await api(`/gratitude/${id}`, { method: 'DELETE' })
    set({ entries: get().entries.filter(e => e._id !== id) })
  },
}))

// ─── PROJECTS TYPES & STORE ─────────────────────────

export interface ProjectTask {
  text: string
  done: boolean
}

export interface ProjectData {
  _id: string
  name: string
  description: string
  status: 'active' | 'completed' | 'archived' | 'on-hold'
  color: string
  progress: number
  deadline: string | null
  tasks: ProjectTask[]
  createdAt: string
  updatedAt: string
}

interface ProjectState {
  projects: ProjectData[]
  isLoading: boolean
  fetchProjects: () => Promise<void>
  addProject: (project: Partial<ProjectData>) => Promise<void>
  updateProject: (id: string, project: Partial<ProjectData>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  isLoading: false,
  fetchProjects: async () => {
    set({ isLoading: true })
    try { set({ projects: await api('/projects') }) } finally { set({ isLoading: false }) }
  },
  addProject: async (project) => {
    const data = await api('/projects', { method: 'POST', body: JSON.stringify(project) })
    set({ projects: [data, ...get().projects] })
  },
  updateProject: async (id, project) => {
    const data = await api(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(project) })
    set({ projects: get().projects.map(p => p._id === id ? data : p) })
  },
  deleteProject: async (id) => {
    await api(`/projects/${id}`, { method: 'DELETE' })
    set({ projects: get().projects.filter(p => p._id !== id) })
  },
}))

// ─── FLASHCARDS TYPES & STORE ───────────────────────

export interface FlashcardData {
  _id: string
  deck: string
  front: string
  back: string
  difficulty: 'easy' | 'medium' | 'hard'
  nextReview: string
  timesReviewed: number
  timesCorrect: number
}

interface FlashcardState {
  cards: FlashcardData[]
  isLoading: boolean
  fetchCards: () => Promise<void>
  addCard: (card: Partial<FlashcardData>) => Promise<void>
  updateCard: (id: string, card: Partial<FlashcardData>) => Promise<void>
  deleteCard: (id: string) => Promise<void>
}

export const useFlashcardStore = create<FlashcardState>((set, get) => ({
  cards: [],
  isLoading: false,
  fetchCards: async () => {
    set({ isLoading: true })
    try { set({ cards: await api('/flashcards') }) } finally { set({ isLoading: false }) }
  },
  addCard: async (card) => {
    const data = await api('/flashcards', { method: 'POST', body: JSON.stringify(card) })
    set({ cards: [data, ...get().cards] })
  },
  updateCard: async (id, card) => {
    const data = await api(`/flashcards/${id}`, { method: 'PUT', body: JSON.stringify(card) })
    set({ cards: get().cards.map(c => c._id === id ? data : c) })
  },
  deleteCard: async (id) => {
    await api(`/flashcards/${id}`, { method: 'DELETE' })
    set({ cards: get().cards.filter(c => c._id !== id) })
  },
}))

// ─── WISHLIST TYPES & STORE ─────────────────────────

export interface WishlistData {
  _id: string
  name: string
  category: 'buy' | 'experience' | 'travel' | 'learn' | 'other'
  priority: 'low' | 'medium' | 'high'
  estimatedCost: number
  url: string
  notes: string
  completed: boolean
  createdAt: string
}

interface WishlistState {
  items: WishlistData[]
  isLoading: boolean
  fetchItems: () => Promise<void>
  addItem: (item: Partial<WishlistData>) => Promise<void>
  updateItem: (id: string, item: Partial<WishlistData>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  isLoading: false,
  fetchItems: async () => {
    set({ isLoading: true })
    try { set({ items: await api('/wishlist') }) } finally { set({ isLoading: false }) }
  },
  addItem: async (item) => {
    const data = await api('/wishlist', { method: 'POST', body: JSON.stringify(item) })
    set({ items: [data, ...get().items] })
  },
  updateItem: async (id, item) => {
    const data = await api(`/wishlist/${id}`, { method: 'PUT', body: JSON.stringify(item) })
    set({ items: get().items.map(i => i._id === id ? data : i) })
  },
  deleteItem: async (id) => {
    await api(`/wishlist/${id}`, { method: 'DELETE' })
    set({ items: get().items.filter(i => i._id !== id) })
  },
}))

// ─── CHAT ──────────────────────────────────────────────────────────
export interface ChatMessageData {
  _id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface ChatState {
  messages: ChatMessageData[]
  isLoading: boolean
  isStreaming: boolean
  fetchMessages: () => Promise<void>
  sendMessage: (content: string) => Promise<void>
  clearChat: () => Promise<void>
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  isStreaming: false,

  fetchMessages: async () => {
    set({ isLoading: true })
    try {
      const data = await api('/chat')
      set({ messages: data })
    } finally {
      set({ isLoading: false })
    }
  },

  sendMessage: async (content) => {
    const userMsg: ChatMessageData = {
      _id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    set({ messages: [...get().messages, userMsg], isStreaming: true })

    try {
      const { provider, model } = useSettingsStore.getState().getAiConfig()
      const token = localStorage.getItem('lifeos-token')
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: content, provider, model }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Chat request failed')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      const assistantMsg: ChatMessageData = {
        _id: `temp-assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      }
      set({ messages: [...get().messages, assistantMsg] })

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
          for (const line of lines) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                assistantContent += parsed.content
                const msgs = [...get().messages]
                const last = msgs[msgs.length - 1]
                if (last.role === 'assistant') {
                  last.content = assistantContent
                  set({ messages: [...msgs] })
                }
              }
              if (parsed.savedMessages) {
                const msgs = get().messages
                const updated = [...msgs.slice(0, -2), ...parsed.savedMessages]
                set({ messages: updated })
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      const errMsg: ChatMessageData = {
        _id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Something went wrong'}`,
        createdAt: new Date().toISOString(),
      }
      set({ messages: [...get().messages, errMsg] })
    } finally {
      set({ isStreaming: false })
    }
  },

  clearChat: async () => {
    await api('/chat', { method: 'DELETE' })
    set({ messages: [] })
  },
}))

// ─── WHITEBOARD TYPES & STORE ───────────────────────

export interface WhiteboardFolderData {
  _id: string
  name: string
  parentId: string | null
  color: string
  createdAt: string
  updatedAt: string
}

export interface WhiteboardData {
  _id: string
  title: string
  folderId: string | null
  snapshot: Record<string, unknown>
  thumbnail: string
  createdAt: string
  updatedAt: string
}

interface WhiteboardState {
  boards: WhiteboardData[]
  folders: WhiteboardFolderData[]
  activeBoard: WhiteboardData | null
  isLoading: boolean
  fetchBoards: () => Promise<void>
  fetchFolders: () => Promise<void>
  saveBoard: (board: Partial<WhiteboardData>) => Promise<WhiteboardData>
  deleteBoard: (id: string) => Promise<void>
  saveFolder: (folder: Partial<WhiteboardFolderData>) => Promise<WhiteboardFolderData>
  deleteFolder: (id: string) => Promise<void>
  setActiveBoard: (board: WhiteboardData | null) => void
}

export const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
  boards: [],
  folders: [],
  activeBoard: null,
  isLoading: false,
  fetchBoards: async () => {
    set({ isLoading: true })
    try { set({ boards: await api('/whiteboards') }) } finally { set({ isLoading: false }) }
  },
  fetchFolders: async () => {
    try { set({ folders: await api('/whiteboards/folders') }) } catch { /* */ }
  },
  saveBoard: async (board) => {
    const data = await api('/whiteboards', { method: 'POST', body: JSON.stringify(board) })
    const existing = get().boards.find(b => b._id === data._id)
    if (existing) {
      set({ boards: get().boards.map(b => b._id === data._id ? data : b), activeBoard: data })
    } else {
      set({ boards: [data, ...get().boards], activeBoard: data })
    }
    return data
  },
  deleteBoard: async (id) => {
    await api(`/whiteboards/${id}`, { method: 'DELETE' })
    const boards = get().boards.filter(b => b._id !== id)
    set({ boards, activeBoard: get().activeBoard?._id === id ? null : get().activeBoard })
  },
  saveFolder: async (folder) => {
    const data = await api('/whiteboards/folders', { method: 'POST', body: JSON.stringify(folder) })
    const existing = get().folders.find(f => f._id === data._id)
    if (existing) {
      set({ folders: get().folders.map(f => f._id === data._id ? data : f) })
    } else {
      set({ folders: [...get().folders, data] })
    }
    return data
  },
  deleteFolder: async (id) => {
    await api(`/whiteboards/folders/${id}`, { method: 'DELETE' })
    set({ folders: get().folders.filter(f => f._id !== id) })
    // Move boards from deleted folder to root in local state
    set({ boards: get().boards.map(b => b.folderId === id ? { ...b, folderId: null } : b) })
  },
  setActiveBoard: (board) => set({ activeBoard: board }),
}))
