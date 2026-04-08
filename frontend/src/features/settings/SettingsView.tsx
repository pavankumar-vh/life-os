'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useAuthStore, useBackupStore, useAppStore, useHabitsStore, useJournalStore, useWorkoutsStore, useMealsStore, useTasksStore, useGoalsStore, useSettingsStore, DEFAULT_GOALS } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, Download, Upload, Shield, Database, CheckCircle2, AlertTriangle, HardDrive, RefreshCw, Cloud, Package, ArrowRightLeft, Unlock,
  Palette, Eye, EyeOff, Keyboard, Bot, Key, Trash2, Target, Droplets, Dumbbell, Scale, Activity, Moon, Utensils, Link2, Unlink, Calendar, CloudUpload, Loader2, Footprints, X, ExternalLink, FileJson2
} from 'lucide-react'
import { toast } from '@/components/Toast'
import { getApiBaseUrl } from '@/lib/api'

const ACCENT_PRESETS = [
  // Warm
  { name: 'Warm Sand', color: '#e8d5b7' },
  { name: 'Amber', color: '#fb923c' },
  { name: 'Peach', color: '#f9a8d4' },
  { name: 'Gold', color: '#eab308' },
  // Cool
  { name: 'Ocean Blue', color: '#60a5fa' },
  { name: 'Cyan', color: '#22d3ee' },
  { name: 'Teal', color: '#2dd4bf' },
  { name: 'Sky', color: '#38bdf8' },
  // Nature
  { name: 'Emerald', color: '#34d399' },
  { name: 'Lime', color: '#a3e635' },
  { name: 'Mint', color: '#6ee7b7' },
  // Vibrant
  { name: 'Lavender', color: '#a78bfa' },
  { name: 'Rose', color: '#fb7185' },
  { name: 'Fuchsia', color: '#e879f9' },
  { name: 'Coral', color: '#f97316' },
  { name: 'Crimson', color: '#ef4444' },
]

type GoalKeys = keyof typeof DEFAULT_GOALS
type GoogleFitnessDay = { date: string; steps: number; calories: number }

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`w-11 h-6 rounded-full transition-colors relative ${on ? 'bg-accent' : 'bg-white/10'}`}>
      <motion.div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow" animate={{ left: on ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
    </button>
  )
}

const AI_PROVIDERS = [
  { id: 'openai',    label: 'OpenAI',          icon: '⬡', placeholder: 'sk-proj-...', link: 'https://platform.openai.com/api-keys',          linkLabel: 'platform.openai.com' },
  { id: 'gemini',    label: 'Gemini',           icon: '✦', placeholder: 'AIzaSy...',  link: 'https://aistudio.google.com/apikey',             linkLabel: 'aistudio.google.com' },
  { id: 'anthropic', label: 'Claude',           icon: '◈', placeholder: 'sk-ant-...', link: 'https://console.anthropic.com/settings/keys',    linkLabel: 'console.anthropic.com' },
  { id: 'groq',      label: 'Groq',             icon: '⚡', placeholder: 'gsk_...',    link: 'https://console.groq.com/keys',                  linkLabel: 'console.groq.com' },
]

function AiKeysSection() {
  const aiKeys = useSettingsStore(s => s.aiKeys)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [inputVal, setInputVal] = useState('')

  const save = (id: string) => {
    const val = inputVal.trim()
    if (!val) return
    const s = useSettingsStore.getState()
    s.updateSettings({ aiKeys: { ...s.aiKeys, [id]: val } })
    setEditingId(null)
    setInputVal('')
  }
  const remove = (id: string) => {
    const s = useSettingsStore.getState()
    const keys = { ...s.aiKeys }
    delete keys[id]
    s.updateSettings({ aiKeys: keys })
  }

  return (
    <div className="space-y-2">
      {AI_PROVIDERS.map(prov => {
        const storedKey = (aiKeys as Record<string,string>)[prov.id] || ''
        const isEditing = editingId === prov.id
        return (
          <div key={prov.id} className="p-3 bg-bg-elevated rounded-xl space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-base leading-none shrink-0">{prov.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-primary">{prov.label}</p>
                {storedKey ? (
                  <p className="text-xs text-green-soft font-mono">Connected · ...{storedKey.slice(-6)}</p>
                ) : (
                  <p className="text-xs text-text-muted">
                    Not set ·{' '}
                    <a href={prov.link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{prov.linkLabel}</a>
                  </p>
                )}
              </div>
              {storedKey ? (
                <button onClick={() => remove(prov.id)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-red-soft hover:bg-red-soft/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button onClick={() => { setEditingId(prov.id); setInputVal('') }}
                  className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors flex items-center gap-1 shrink-0">
                  <Key className="w-3 h-3" /> Add Key
                </button>
              )}
            </div>
            {isEditing && (
              <div className="flex gap-1.5">
                <input
                  autoFocus
                  type="password"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') save(prov.id); if (e.key === 'Escape') setEditingId(null) }}
                  placeholder={prov.placeholder}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-accent/30 text-xs text-text-primary placeholder:text-text-muted font-mono outline-none focus:border-accent/60 transition-colors"
                />
                <button onClick={() => save(prov.id)} disabled={!inputVal.trim()}
                  className="px-3 py-1.5 rounded-lg bg-accent text-[#1a1a1a] text-xs font-semibold hover:bg-accent/90 transition-colors disabled:opacity-30">
                  Save
                </button>
                <button onClick={() => setEditingId(null)}
                  className="px-2.5 py-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/[0.05] transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function SettingsView() {
  const { user } = useAuthStore()
  const { isExporting, isImporting, lastBackup, exportData, importData } = useBackupStore()
  const { accentColor, setAccentColor, focusMode, toggleFocusMode } = useAppStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'goals' | 'google' | 'data'>('general')

  // Google integration state
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [driveBackupLoading, setDriveBackupLoading] = useState(false)
  const [driveBackups, setDriveBackups] = useState<Array<{ id: string; name: string; createdAt: string; size?: string; link?: string }> | null>(null)
  const [backupsLoading, setBackupsLoading] = useState(false)
  const [fitnessLoading, setFitnessLoading] = useState(false)
  const [fitnessData, setFitnessData] = useState<GoogleFitnessDay[]>([])
  const [fitnessError, setFitnessError] = useState<string | null>(null)
  const [fitnessLastSyncedAt, setFitnessLastSyncedAt] = useState<string | null>(null)
  const apiBase = getApiBaseUrl()
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('lifeos-token') : null

  const checkGoogleStatus = useCallback(async () => {
    if (!authToken) return
    try {
      const r = await fetch(`${apiBase}/api/google/status`, { headers: { Authorization: `Bearer ${authToken}` } })
      const d = await r.json()
      setGoogleConnected(d.connected)
    } catch {}
  }, [authToken, apiBase])

  // Check Google connection status
  useEffect(() => {
    checkGoogleStatus()
  }, [checkGoogleStatus])

  // Load Drive backups when connected
  const fetchDriveBackups = useCallback(async () => {
    if (!authToken || !googleConnected) return
    setBackupsLoading(true)
    try {
      const r = await fetch(`${apiBase}/api/google/drive/backups`, { headers: { Authorization: `Bearer ${authToken}` } })
      const d = await r.json()
      setDriveBackups(Array.isArray(d) ? d : [])
    } catch {
      setDriveBackups([])
    } finally {
      setBackupsLoading(false)
    }
  }, [authToken, apiBase, googleConnected])

  useEffect(() => {
    if (googleConnected) fetchDriveBackups()
  }, [googleConnected, fetchDriveBackups])

  const fetchFitnessData = useCallback(async ({ silent = false, force = false }: { silent?: boolean; force?: boolean } = {}) => {
    if (!authToken || (!googleConnected && !force)) {
      if (!googleConnected) {
        setFitnessData([])
        setFitnessError(null)
        setFitnessLastSyncedAt(null)
      }
      return
    }

    if (!silent) setFitnessLoading(true)
    setFitnessError(null)

    try {
      const toDate = new Date()
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - 13)

      const from = fromDate.toISOString().split('T')[0]
      const to = toDate.toISOString().split('T')[0]

      const res = await fetch(`${apiBase}/api/google/fitness/steps?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch Google Fit data')
      }

      const normalized: GoogleFitnessDay[] = (Array.isArray(data) ? data : [])
        .map((day: any) => ({
          date: String(day?.date || ''),
          steps: Number(day?.steps || 0),
          calories: Number(day?.calories || 0),
        }))
        .filter((day) => !!day.date)
        .sort((a, b) => a.date.localeCompare(b.date))

      setFitnessData(normalized)
      setFitnessLastSyncedAt(new Date().toISOString())
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch Google Fit data'
      setFitnessError(message)
      if (!silent) {
        toast.error(message)
      }
    } finally {
      if (!silent) setFitnessLoading(false)
    }
  }, [apiBase, authToken, googleConnected])

  useEffect(() => {
    if (!googleConnected) {
      setFitnessData([])
      setFitnessError(null)
      setFitnessLastSyncedAt(null)
      return
    }
    if (activeTab === 'google') {
      fetchFitnessData({ silent: true }).catch(() => {})
    }
  }, [activeTab, googleConnected, fetchFitnessData])

  useEffect(() => {
    if (!googleConnected || activeTab !== 'google') return

    const interval = window.setInterval(() => {
      fetchFitnessData({ silent: true }).catch(() => {})
    }, 60000)

    return () => window.clearInterval(interval)
  }, [activeTab, googleConnected, fetchFitnessData])

  // Google OAuth via popup
  const handleGoogleConnect = useCallback(async () => {
    setGoogleLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/google/auth-url`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      const { url, error } = await res.json()
      if (error) { toast.error(error); setGoogleLoading(false); return }
      if (!url) { toast.error('Failed to get auth URL'); setGoogleLoading(false); return }

      // Open OAuth in popup window
      const width = 500, height = 640
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2
      const popup = window.open(url, 'google-oauth', `width=${width},height=${height},left=${left},top=${top},toolbar=0,menubar=0`)

      // Poll for popup close and check status
      const interval = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(interval)
          setGoogleLoading(false)
          // Check if connection succeeded
          await checkGoogleStatus()
          // Give state time to update, then show feedback
          setTimeout(async () => {
            const r = await fetch(`${apiBase}/api/google/status`, { headers: { Authorization: `Bearer ${authToken}` } })
            const d = await r.json()
            if (d.connected) {
              toast.success('Google account connected!')
              fetchFitnessData({ silent: true, force: true }).catch(() => {})
            }
          }, 300)
        }
      }, 500)
    } catch {
      toast.error('Failed to start Google OAuth')
      setGoogleLoading(false)
    }
  }, [apiBase, authToken, checkGoogleStatus, fetchFitnessData])

  // Goals from settings store
  const settingsGoals = useSettingsStore(s => s.goals)
  const settingsAiKeys = useSettingsStore(s => s.aiKeys)
  const [goals, setGoals] = useState(settingsGoals || DEFAULT_GOALS)
  const updateGoal = (key: GoalKeys, val: string) => {
    const num = parseInt(val) || 0
    const next = { ...goals, [key]: num }
    setGoals(next)
    useSettingsStore.getState().updateSettings({ goals: next })
  }

  const habits = useHabitsStore(s => s.habits)
  const entries = useJournalStore(s => s.entries)
  const workouts = useWorkoutsStore(s => s.workouts)
  const meals = useMealsStore(s => s.meals)
  const tasks = useTasksStore(s => s.tasks)
  const goalsData = useGoalsStore(s => s.goals)
  const totalRecords = habits.length + entries.length + workouts.length + meals.length + tasks.length + goalsData.length

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setImportResult(null)
    const result = await importData(file)
    setImportResult(result)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleRefreshAll = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        useHabitsStore.getState().fetchHabits(), useJournalStore.getState().fetchEntries(),
        useWorkoutsStore.getState().fetchWorkouts(), useMealsStore.getState().fetchMeals(),
        useTasksStore.getState().fetchTasks(), useGoalsStore.getState().fetchGoals(),
        ...(googleConnected ? [fetchFitnessData({ silent: true })] : []),
      ])
    } catch {} finally { setRefreshing(false) }
  }

  const fitnessSummary = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const todayData = fitnessData.find((d) => d.date === today) || { date: today, steps: 0, calories: 0 }
    const last7 = fitnessData.slice(-7)
    const totalSteps = last7.reduce((sum, d) => sum + d.steps, 0)
    const totalCalories = last7.reduce((sum, d) => sum + d.calories, 0)

    return {
      todaySteps: todayData.steps,
      todayCalories: todayData.calories,
      avgSteps: last7.length ? Math.round(totalSteps / last7.length) : 0,
      avgCalories: last7.length ? Math.round(totalCalories / last7.length) : 0,
      recent: [...last7].reverse(),
    }
  }, [fitnessData])

  const handleExportCSV = () => {
    const rows: string[][] = [['Category', 'Title', 'Date', 'Details']]
    habits.forEach(h => rows.push(['Habit', h.name, '', `Streak: ${h.streak}, Best: ${h.bestStreak}`]))
    entries.forEach(e => rows.push(['Journal', e.title, e.date, `Mood: ${e.mood}`]))
    tasks.forEach(t => rows.push(['Task', t.title, t.dueDate || '', `Status: ${t.status}, Priority: ${t.priority}`]))
    goalsData.forEach(g => rows.push(['Goal', g.title, g.deadline || '', `${g.progress}/${g.target} ${g.unit}`]))
    workouts.forEach(w => rows.push(['Workout', w.name, w.date, `${w.duration}min, ${w.exercises.length} exercises`]))
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `lifeos-export-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  const formatBackupDate = (iso: string) => new Date(iso).toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const TABS = [
    { id: 'general' as const, label: 'General' },
    { id: 'goals' as const, label: 'Goals & Targets' },
    { id: 'google' as const, label: 'Google' },
    { id: 'data' as const, label: 'Data' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-accent" /> Settings
        </h1>
        <p className="text-text-secondary text-sm mt-1">Manage your preferences, goals, and data</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 p-1 bg-bg-elevated rounded-xl overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-accent/12 text-accent shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}>{tab.label}</button>
        ))}
      </div>

      {/* ═══ GENERAL TAB ═══ */}
      {activeTab === 'general' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Profile */}
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
                <span className="text-accent text-xl font-semibold">{user?.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">{user?.name}</h2>
                <p className="text-text-secondary text-xs">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-muted">Level {user?.level}</span>
                  <div className="flex-1 max-w-[120px] h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(100, ((user?.xp || 0) / ((user?.level || 1) * 100)) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-accent font-medium">{user?.xp} XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="card">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-accent" /> Appearance
            </h3>
            <p className="text-xs text-text-secondary mb-2.5">Accent Color</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {ACCENT_PRESETS.map(p => (
                <button key={p.color} onClick={() => setAccentColor(p.color)} title={p.name}
                  className="relative w-8 h-8 rounded-full transition-all hover:scale-110 active:scale-95"
                  style={{ background: p.color, boxShadow: accentColor === p.color ? `0 0 0 2px #0a0a0a, 0 0 0 4px ${p.color}` : 'none' }}>
                  {accentColor === p.color && <CheckCircle2 className="w-3.5 h-3.5 absolute inset-0 m-auto text-[#1a1a1a]/80" />}
                </button>
              ))}
              <label title="Custom color" className="relative w-8 h-8 rounded-full border-2 border-dashed border-border hover:border-text-muted cursor-pointer flex items-center justify-center transition-colors hover:scale-110"
                style={!ACCENT_PRESETS.some(p => p.color === accentColor) ? { background: accentColor, borderStyle: 'solid', borderColor: accentColor, boxShadow: `0 0 0 2px #0a0a0a, 0 0 0 4px ${accentColor}` } : {}}>
                {ACCENT_PRESETS.some(p => p.color === accentColor) ? <Palette className="w-3.5 h-3.5 text-text-muted" /> : <CheckCircle2 className="w-3.5 h-3.5 text-[#1a1a1a]/80" />}
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
              </label>
            </div>
            <div className="flex items-center justify-between p-3 bg-bg-elevated rounded-lg">
              <div className="flex items-center gap-3">
                {focusMode ? <EyeOff className="w-4 h-4 text-accent" /> : <Eye className="w-4 h-4 text-text-muted" />}
                <div>
                  <p className="text-sm font-medium">Focus Mode</p>
                  <p className="text-xs text-text-muted">Hide sidebar and show only current view</p>
                </div>
              </div>
              <Toggle on={focusMode} onToggle={toggleFocusMode} />
            </div>
          </div>

          {/* AI Configuration */}
          <div className="card">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-accent" /> AI Assistant
            </h3>
            <p className="text-xs text-text-muted mb-4">API keys are encrypted and stored securely. Set provider &amp; model in the chat panel.</p>
            <AiKeysSection />
          </div>

          {/* Keyboard Shortcuts */}
          <div className="card">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
              <Keyboard className="w-4 h-4 text-accent" /> Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[
                { keys: '⌘K', desc: 'Command palette' }, { keys: '⌘J', desc: 'AI Chat' },
                { keys: '⌘N', desc: 'Quick Add' }, { keys: '⌘/', desc: 'Focus Mode' },
                { keys: '⌘1-9', desc: 'Navigate views' }, { keys: 'Esc', desc: 'Close dialogs' },
              ].map(s => (
                <div key={s.keys} className="flex items-center justify-between p-2.5 bg-bg-elevated rounded-lg">
                  <span className="text-xs text-text-secondary">{s.desc}</span>
                  <kbd className="kbd">{s.keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ GOALS & UNITS TAB ═══ */}
      {activeTab === 'goals' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="card">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-accent" /> Daily Targets
            </h3>
            <p className="text-xs text-text-muted mb-5">Customize your daily goals. These are used across Dashboard, Diet, Water, Sleep, and other views.</p>

            <div className="space-y-4">
              {/* Nutrition */}
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Nutrition</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'calories' as GoalKeys, label: 'Calories', unit: 'kcal', icon: Utensils, color: 'text-accent' },
                    { key: 'protein' as GoalKeys, label: 'Protein', unit: 'g', icon: Dumbbell, color: 'text-green-soft' },
                    { key: 'carbs' as GoalKeys, label: 'Carbs', unit: 'g', icon: Activity, color: 'text-blue-soft' },
                    { key: 'fat' as GoalKeys, label: 'Fat', unit: 'g', icon: Scale, color: 'text-orange-soft' },
                  ].map(g => (
                    <div key={g.key} className="p-3 bg-bg-elevated rounded-xl">
                      <div className="flex items-center gap-1.5 mb-2">
                        <g.icon className={`w-3.5 h-3.5 ${g.color}`} />
                        <span className="text-xs text-text-secondary font-medium">{g.label}</span>
                      </div>
                      <div className="relative">
                        <input type="number" value={goals[g.key]} onChange={e => updateGoal(g.key, e.target.value)}
                          className="input w-full text-lg font-bold pr-12 text-text-primary" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">{g.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Health */}
              <div>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Health & Fitness</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: 'water' as GoalKeys, label: 'Water', unit: 'glasses', icon: Droplets, color: 'text-blue-soft' },
                    { key: 'sleep' as GoalKeys, label: 'Sleep', unit: 'hours', icon: Moon, color: 'text-purple-soft' },
                    { key: 'steps' as GoalKeys, label: 'Steps', unit: 'steps/day', icon: Activity, color: 'text-green-soft' },
                  ].map(g => (
                    <div key={g.key} className="p-3 bg-bg-elevated rounded-xl">
                      <div className="flex items-center gap-1.5 mb-2">
                        <g.icon className={`w-3.5 h-3.5 ${g.color}`} />
                        <span className="text-xs text-text-secondary font-medium">{g.label}</span>
                      </div>
                      <div className="relative">
                        <input type="number" value={goals[g.key]} onChange={e => updateGoal(g.key, e.target.value)}
                          className="input w-full text-lg font-bold pr-16 text-text-primary" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">{g.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workout frequency */}
              <div className="p-3 bg-bg-elevated rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-accent" />
                    <div>
                      <p className="text-sm font-medium">Workouts per week</p>
                      <p className="text-xs text-text-muted">Target weekly workout sessions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateGoal('workoutsPerWeek', String(Math.max(1, goals.workoutsPerWeek - 1)))}
                      className="w-8 h-8 rounded-lg bg-bg-hover flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors text-lg">−</button>
                    <span className="text-lg font-bold text-accent w-6 text-center">{goals.workoutsPerWeek}</span>
                    <button onClick={() => updateGoal('workoutsPerWeek', String(Math.min(7, goals.workoutsPerWeek + 1)))}
                      className="w-8 h-8 rounded-lg bg-bg-hover flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors text-lg">+</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 p-3 bg-accent/5 border border-accent/10 rounded-lg">
              <p className="text-xs text-accent">These goals sync automatically across all views. Changes take effect immediately.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ GOOGLE TAB ═══ */}
      {activeTab === 'google' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Connection Status */}
          <div className="card">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-1">
              <Link2 className="w-4 h-4 text-accent" /> Google Account
            </h3>
            <p className="text-xs text-text-muted mb-4">
              Connect your Google account to sync calendar events, backup to Drive, and import fitness data.
            </p>
            {googleConnected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-soft/5 border border-green-soft/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-soft" />
                    <span className="text-xs text-green-soft font-medium">Google account connected</span>
                  </div>
                  <button
                    onClick={async () => {
                      setGoogleLoading(true)
                      try {
                        await fetch(`${apiBase}/api/google/disconnect`, {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${authToken}` },
                        })
                        setGoogleConnected(false)
                        setDriveBackups(null)
                        toast.success('Google account disconnected')
                      } catch { toast.error('Failed to disconnect') }
                      setGoogleLoading(false)
                    }}
                    disabled={googleLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <Unlink className="w-3 h-3" /> Disconnect
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: Calendar, label: 'Calendar', desc: 'Events synced' },
                    { icon: CloudUpload, label: 'Drive', desc: 'Backup ready' },
                    { icon: Footprints, label: 'Fitness', desc: 'Steps & calories' },
                  ].map(s => (
                    <div key={s.label} className="flex flex-col items-center gap-1 p-2.5 bg-bg-elevated rounded-lg">
                      <s.icon className="w-4 h-4 text-accent" />
                      <p className="text-xs font-medium">{s.label}</p>
                      <p className="text-[11px] text-green-soft">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <button
                onClick={handleGoogleConnect}
                disabled={googleLoading}
                className="flex items-center gap-3 p-4 bg-bg-elevated rounded-xl hover:bg-bg-hover transition-all w-full text-left group border border-border hover:border-accent/30"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-soft/10 flex items-center justify-center">
                  {googleLoading ? <Loader2 className="w-5 h-5 text-blue-soft animate-spin" /> : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium group-hover:text-accent transition-colors">
                    {googleLoading ? 'Opening Google sign-in...' : 'Sign in with Google'}
                  </p>
                  <p className="text-xs text-text-muted">Calendar · Drive · Fitness — opens a popup</p>
                </div>
                <ExternalLink className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
              </button>
            )}
          </div>

          {/* Calendar Sync */}
          <div className="card">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-accent" /> Google Calendar
            </h3>
            <p className="text-xs text-text-muted mb-3">View your calendar events in the Calendar view when connected.</p>
            <div className={`p-3 rounded-lg ${googleConnected ? 'bg-green-soft/5 border border-green-soft/10' : 'bg-bg-elevated'}`}>
              <p className="text-xs font-medium">{googleConnected ? 'Calendar sync active' : 'Connect Google to enable calendar sync'}</p>
              <p className="text-xs text-text-muted mt-0.5">Events appear automatically in your Calendar view.</p>
            </div>
          </div>

          {/* Drive Backup */}
          <div className="card">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-1">
              <CloudUpload className="w-4 h-4 text-accent" /> Google Drive Backup
            </h3>
            <p className="text-xs text-text-muted mb-3">Back up all your LifeOS data to Google Drive.</p>
            {googleConnected ? (
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    setDriveBackupLoading(true)
                    try {
                      const res = await fetch(`${apiBase}/api/google/drive/backup`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${authToken}` },
                      })
                      const data = await res.json()
                      if (data.error) { toast.error(data.error); return }
                      toast.success(`Backup saved: ${data.file.name}`)
                      // Refresh backup list
                      fetchDriveBackups()
                    } catch { toast.error('Backup failed') }
                    setDriveBackupLoading(false)
                  }}
                  disabled={driveBackupLoading}
                  className="flex items-center gap-3 p-4 bg-bg-elevated rounded-xl hover:bg-bg-hover transition-all w-full text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    {driveBackupLoading ? <Loader2 className="w-5 h-5 text-accent animate-spin" /> : <CloudUpload className="w-5 h-5 text-accent" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium group-hover:text-accent transition-colors">
                      {driveBackupLoading ? 'Backing up...' : 'Backup Now'}
                    </p>
                    <p className="text-xs text-text-muted">Saves to "LifeOS Backups" folder in Drive</p>
                  </div>
                </button>

                {/* Previous Backups */}
                {driveBackups !== null && (
                  <div>
                    <p className="text-xs font-medium text-text-secondary mb-2">
                      {backupsLoading ? 'Loading backups...' : `${driveBackups.length} backup${driveBackups.length !== 1 ? 's' : ''} in Drive`}
                    </p>
                    {driveBackups.length > 0 && (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {driveBackups.map(b => (
                          <div key={b.id} className="flex items-center gap-2 p-2.5 bg-bg-elevated rounded-lg">
                            <FileJson2 className="w-4 h-4 text-accent shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-text-primary truncate">{b.name}</p>
                              <p className="text-[11px] text-text-muted">
                                {new Date(b.createdAt).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                                {b.size ? ` · ${Math.round(parseInt(b.size) / 1024)} KB` : ''}
                              </p>
                            </div>
                            {b.link && (
                              <a href={b.link} target="_blank" rel="noopener noreferrer"
                                className="p-1 rounded hover:bg-bg-hover transition-colors text-text-muted hover:text-accent">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-bg-elevated rounded-lg">
                <p className="text-xs text-text-muted">Connect Google to enable Drive backups.</p>
              </div>
            )}
          </div>

          {/* Fitness */}
          <div className="card">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-1">
              <Footprints className="w-4 h-4 text-accent" /> Google Fitness
            </h3>
            <p className="text-xs text-text-muted mb-3">Import step count and calorie data from Google Fit.</p>
            {googleConnected ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-soft/5 border border-green-soft/10 gap-3">
                  <div>
                    <p className="text-xs font-medium">Fitness data sync active</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {fitnessLastSyncedAt ? `Last synced ${new Date(fitnessLastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not synced yet'}
                    </p>
                  </div>
                  <button
                    onClick={() => fetchFitnessData()}
                    disabled={fitnessLoading}
                    className="btn-ghost text-xs flex items-center gap-1.5 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${fitnessLoading ? 'animate-spin' : ''}`} />
                    {fitnessLoading ? 'Syncing...' : 'Sync now'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-bg-elevated rounded-lg">
                    <p className="text-[11px] text-text-muted">Today Steps</p>
                    <p className="text-lg font-semibold text-green-soft">{fitnessSummary.todaySteps.toLocaleString()}</p>
                    <p className="text-[11px] text-text-muted">7d avg {fitnessSummary.avgSteps.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-bg-elevated rounded-lg">
                    <p className="text-[11px] text-text-muted">Today Calories</p>
                    <p className="text-lg font-semibold text-orange-soft">{fitnessSummary.todayCalories.toLocaleString()}</p>
                    <p className="text-[11px] text-text-muted">7d avg {fitnessSummary.avgCalories.toLocaleString()}</p>
                  </div>
                </div>

                <div className="p-3 bg-bg-elevated rounded-lg">
                  <p className="text-xs font-medium text-text-secondary mb-2">Recent fitness days</p>
                  {fitnessSummary.recent.length > 0 ? (
                    <div className="space-y-1.5">
                      {fitnessSummary.recent.slice(0, 5).map((day) => (
                        <div key={day.date} className="flex items-center justify-between text-xs">
                          <span className="text-text-muted">{new Date(`${day.date}T00:00:00`).toLocaleDateString('en', { day: 'numeric', month: 'short' })}</span>
                          <span className="text-text-primary">{day.steps.toLocaleString()} steps · {day.calories.toLocaleString()} kcal</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted">{fitnessError || 'No Google Fit data found yet. Tap Sync now to refresh.'}</p>
                  )}
                  {fitnessError && fitnessSummary.recent.length > 0 && (
                    <p className="text-[11px] text-red-soft mt-2">{fitnessError}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-bg-elevated rounded-lg">
                <p className="text-xs font-medium">Connect Google to enable fitness sync</p>
                <p className="text-xs text-text-muted mt-0.5">Step count and calories from Google Fit.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ═══ DATA TAB ═══ */}
      {activeTab === 'data' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Data Overview */}
          <div className="card">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-4">
              <Database className="w-4 h-4 text-accent" /> Your Data
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
              {[
                { label: 'Habits', count: habits.length, color: 'text-purple-soft' },
                { label: 'Journal', count: entries.length, color: 'text-accent' },
                { label: 'Workouts', count: workouts.length, color: 'text-green-soft' },
                { label: 'Meals', count: meals.length, color: 'text-orange-soft' },
                { label: 'Tasks', count: tasks.length, color: 'text-blue-soft' },
                { label: 'Goals', count: goalsData.length, color: 'text-accent' },
              ].map(d => (
                <div key={d.label} className="text-center p-3 bg-bg-elevated rounded-xl">
                  <p className={`text-xl font-bold ${d.color}`}>{d.count}</p>
                  <p className="text-xs text-text-secondary">{d.label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between p-3 bg-bg-elevated rounded-xl">
              <div>
                <p className="text-sm font-medium">{totalRecords} total records</p>
                <p className="text-xs text-text-muted">Across all categories</p>
              </div>
              <button onClick={handleRefreshAll} disabled={refreshing} className="btn-ghost flex items-center gap-1.5 text-xs">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Syncing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Backup & Restore */}
          <div className="card">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-accent" /> Backup & Restore
            </h3>
            <p className="text-xs text-text-muted mb-4">Export your entire life data. Import on any device.</p>
            {lastBackup && (
              <div className="flex items-center gap-2 p-2.5 bg-green-soft/5 border border-green-soft/10 rounded-lg mb-4">
                <CheckCircle2 className="w-4 h-4 text-green-soft shrink-0" />
                <div>
                  <p className="text-xs text-green-soft font-medium">Last backup</p>
                  <p className="text-xs text-text-muted">{formatBackupDate(lastBackup)}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button onClick={exportData} disabled={isExporting}
                className="flex items-center gap-3 p-4 bg-bg-elevated rounded-xl hover:bg-bg-hover transition-all text-left group">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Download className={`w-5 h-5 text-accent ${isExporting ? 'animate-bounce' : ''}`} />
                </div>
                <div>
                  <p className="text-sm font-medium group-hover:text-accent transition-colors">{isExporting ? 'Exporting...' : 'Export JSON'}</p>
                  <p className="text-xs text-text-muted">Full backup</p>
                </div>
              </button>
              <button onClick={handleExportCSV}
                className="flex items-center gap-3 p-4 bg-bg-elevated rounded-xl hover:bg-bg-hover transition-all text-left group">
                <div className="w-10 h-10 rounded-lg bg-green-soft/10 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-green-soft" />
                </div>
                <div>
                  <p className="text-sm font-medium group-hover:text-green-soft transition-colors">Export CSV</p>
                  <p className="text-xs text-text-muted">Spreadsheet format</p>
                </div>
              </button>
              <label className="flex items-center gap-3 p-4 bg-bg-elevated rounded-xl hover:bg-bg-hover transition-all text-left group cursor-pointer">
                <div className="w-10 h-10 rounded-lg bg-blue-soft/10 flex items-center justify-center shrink-0">
                  <Upload className={`w-5 h-5 text-blue-soft ${isImporting ? 'animate-bounce' : ''}`} />
                </div>
                <div>
                  <p className="text-sm font-medium group-hover:text-blue-soft transition-colors">{isImporting ? 'Importing...' : 'Import Backup'}</p>
                  <p className="text-xs text-text-muted">Restore JSON file</p>
                </div>
                <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" disabled={isImporting} />
              </label>
            </div>
            <AnimatePresence>
              {importResult && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${importResult.success ? 'bg-green-soft/10 text-green-soft' : 'bg-red-soft/10 text-red-soft'}`}>
                  {importResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  <p className="text-xs">{importResult.message}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Data Safety */}
          <div className="card">
            <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
              <HardDrive className="w-4 h-4 text-accent" /> Data Safety
            </h3>
            <div className="space-y-2">
              {[
                { title: 'Cloud Synced', desc: 'Stored in MongoDB Atlas. Accessible from any device.', icon: Cloud },
                { title: 'JSON Backups', desc: 'Export your full dataset anytime. Human-readable.', icon: Package },
                { title: 'Import Anywhere', desc: 'Restore backups on any LifeOS instance.', icon: ArrowRightLeft },
                { title: 'No Lock-in', desc: 'Your data is always yours. Export and leave anytime.', icon: Unlock },
              ].map(item => (
                <div key={item.title} className="flex items-start gap-3 p-3 bg-bg-elevated rounded-xl">
                  <item.icon className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-text-primary">{item.title}</p>
                    <p className="text-xs text-text-muted">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
