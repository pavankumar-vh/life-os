'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuthStore, useBackupStore, useAppStore, useHabitsStore, useJournalStore, useWorkoutsStore, useMealsStore, useTasksStore, useGoalsStore, useSettingsStore, DEFAULT_GOALS } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, Download, Upload, Shield, Database, CheckCircle2, AlertTriangle, HardDrive, RefreshCw, Cloud, Package, ArrowRightLeft, Unlock,
  Palette, Eye, EyeOff, Keyboard, Bot, Key, Trash2, Target, Droplets, Dumbbell, Scale, Activity, Moon, Utensils, Link2, Unlink, Calendar, CloudUpload, Loader2, Footprints
} from 'lucide-react'
import { toast } from '@/components/Toast'

const ACCENT_PRESETS = [
  { name: 'Warm Sand', color: '#e8d5b7' },
  { name: 'Ocean Blue', color: '#60a5fa' },
  { name: 'Emerald', color: '#34d399' },
  { name: 'Lavender', color: '#a78bfa' },
  { name: 'Rose', color: '#fb7185' },
  { name: 'Amber', color: '#fb923c' },
  { name: 'Cyan', color: '#22d3ee' },
  { name: 'Lime', color: '#a3e635' },
]

type GoalKeys = keyof typeof DEFAULT_GOALS

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className={`w-11 h-6 rounded-full transition-colors relative ${on ? 'bg-accent' : 'bg-white/10'}`}>
      <motion.div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow" animate={{ left: on ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
    </button>
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
  const apiBase = typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000')
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('lifeos-token') : null

  // Check Google connection status
  useEffect(() => {
    if (!authToken) return
    fetch(`${apiBase}/api/google/status`, { headers: { Authorization: `Bearer ${authToken}` } })
      .then(r => r.json()).then(d => setGoogleConnected(d.connected)).catch(() => {})
  }, [authToken, apiBase])

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
      ])
    } catch {} finally { setRefreshing(false) }
  }

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
            <div className="flex flex-wrap gap-2.5 mb-5">
              {ACCENT_PRESETS.map(p => (
                <button key={p.color} onClick={() => setAccentColor(p.color)} title={p.name}
                  className="relative w-9 h-9 rounded-full transition-all hover:scale-110"
                  style={{ background: p.color, boxShadow: accentColor === p.color ? `0 0 0 2px #0a0a0a, 0 0 0 4px ${p.color}` : 'none' }}>
                  {accentColor === p.color && <CheckCircle2 className="w-4 h-4 absolute inset-0 m-auto text-[#1a1a1a]/80" />}
                </button>
              ))}
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
            <p className="text-xs text-text-muted mb-4">API keys are stored securely in your account. Switch providers in the chat panel.</p>
            {[
              { id: 'openai', label: 'OpenAI', link: 'https://platform.openai.com/api-keys', linkLabel: 'platform.openai.com' },
              { id: 'gemini', label: 'Google Gemini', link: 'https://aistudio.google.com/apikey', linkLabel: 'aistudio.google.com' },
              { id: 'anthropic', label: 'Anthropic Claude', link: 'https://console.anthropic.com/settings/keys', linkLabel: 'console.anthropic.com' },
            ].map(prov => {
              const storedKey = settingsAiKeys[prov.id] || ''
              return (
                <div key={prov.id} className="flex items-center gap-3 p-3 bg-bg-elevated rounded-lg mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary">{prov.label}</p>
                    {storedKey ? (
                      <p className="text-xs text-green-soft">Connected · ...{storedKey.slice(-4)}</p>
                    ) : (
                      <p className="text-xs text-text-muted truncate">
                        Not set · <a href={prov.link} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{prov.linkLabel}</a>
                      </p>
                    )}
                  </div>
                  {storedKey ? (
                    <button onClick={() => { const s = useSettingsStore.getState(); const keys = { ...s.aiKeys }; delete keys[prov.id]; s.updateSettings({ aiKeys: keys }) }}
                      className="text-text-muted hover:text-red-soft p-1.5 rounded-lg hover:bg-red-soft/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  ) : (
                    <button onClick={() => { const k = prompt(`Enter your ${prov.label} API key:`); if (k?.trim()) { const s = useSettingsStore.getState(); s.updateSettings({ aiKeys: { ...s.aiKeys, [prov.id]: k.trim() } }) } }}
                      className="px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors flex items-center gap-1 shrink-0">
                      <Key className="w-3 h-3" /> Add Key
                    </button>
                  )}
                </div>
              )
            })}
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
            {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-xs text-orange-400 font-medium">Google OAuth not configured</p>
                <p className="text-xs text-text-muted mt-1">Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI in your environment variables.</p>
              </div>
            ) : googleConnected ? (
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
            ) : (
              <button
                onClick={async () => {
                  setGoogleLoading(true)
                  try {
                    const res = await fetch(`${apiBase}/api/google/auth-url`, {
                      headers: { Authorization: `Bearer ${authToken}` },
                    })
                    const { url, error } = await res.json()
                    if (error) { toast.error(error); return }
                    if (url) window.location.href = url
                  } catch { toast.error('Failed to start Google OAuth') }
                  setGoogleLoading(false)
                }}
                disabled={googleLoading}
                className="flex items-center gap-3 p-4 bg-bg-elevated rounded-xl hover:bg-bg-hover transition-all w-full text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-soft/10 flex items-center justify-center">
                  {googleLoading ? <Loader2 className="w-5 h-5 text-blue-soft animate-spin" /> : <Link2 className="w-5 h-5 text-blue-soft" />}
                </div>
                <div>
                  <p className="text-sm font-medium group-hover:text-blue-soft transition-colors">Connect Google Account</p>
                  <p className="text-xs text-text-muted">Calendar, Drive, Fitness</p>
                </div>
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
                    toast.success(`Backup saved to Google Drive: ${data.file.name}`)
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
                    {driveBackupLoading ? 'Backing up...' : 'Backup to Google Drive'}
                  </p>
                  <p className="text-xs text-text-muted">Saves to &quot;LifeOS Backups&quot; folder</p>
                </div>
              </button>
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
            <div className={`p-3 rounded-lg ${googleConnected ? 'bg-green-soft/5 border border-green-soft/10' : 'bg-bg-elevated'}`}>
              <p className="text-xs font-medium">{googleConnected ? 'Fitness data sync active' : 'Connect Google to enable fitness sync'}</p>
              <p className="text-xs text-text-muted mt-0.5">Step count and calories from Google Fit.</p>
            </div>
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
