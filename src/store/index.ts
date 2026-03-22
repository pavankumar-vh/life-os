import { create } from 'zustand'
import { toISODate } from '@/lib/utils'

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
  token: typeof window !== 'undefined' ? localStorage.getItem('lifeos-token') : null,
  isLoading: false,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) localStorage.setItem('lifeos-token', token)
    else localStorage.removeItem('lifeos-token')
    set({ token })
  },
  login: async (email, password) => {
    set({ isLoading: true })
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    localStorage.setItem('lifeos-token', data.token)
    set({ user: data.user, token: data.token, isLoading: false })
  },
  register: async (name, email, password) => {
    set({ isLoading: true })
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed')
    localStorage.setItem('lifeos-token', data.token)
    set({ user: data.user, token: data.token, isLoading: false })
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
  setActiveView: (view: string) => void
  setCommandPaletteOpen: (open: boolean) => void
  setSelectedDate: (date: string) => void
  toggleSidebar: () => void
}

export const useAppStore = create<AppState>((set) => ({
  activeView: 'dashboard',
  commandPaletteOpen: false,
  selectedDate: toISODate(),
  sidebarCollapsed: false,
  setActiveView: (view) => set({ activeView: view }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))

// ─── API HELPER ─────────────────────────────────────

async function api(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('lifeos-token')
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

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
    const data = await api('/habits')
    set({ habits: data, isLoading: false })
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
    const data = await api('/journal')
    set({ entries: data, isLoading: false })
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
    const data = await api('/workouts')
    set({ workouts: data, isLoading: false })
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
    const query = date ? `?date=${date}` : ''
    const data = await api(`/meals${query}`)
    set({ meals: data, isLoading: false })
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
    const data = await api('/tasks')
    set({ tasks: data, isLoading: false })
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
    const data = await api('/goals')
    set({ goals: data, isLoading: false })
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
