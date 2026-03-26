'use client'

import { useState, useRef } from 'react'
import { useAuthStore, useBackupStore, useHabitsStore, useJournalStore, useWorkoutsStore, useMealsStore, useTasksStore, useGoalsStore } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Download, Upload, Shield, Database, User, Clock, CheckCircle2, AlertTriangle, HardDrive, RefreshCw, Cloud, Package, ArrowRightLeft, Unlock } from 'lucide-react'

export function SettingsView() {
  const { user } = useAuthStore()
  const { isExporting, isImporting, lastBackup, exportData, importData } = useBackupStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const habits = useHabitsStore(s => s.habits)
  const entries = useJournalStore(s => s.entries)
  const workouts = useWorkoutsStore(s => s.workouts)
  const meals = useMealsStore(s => s.meals)
  const tasks = useTasksStore(s => s.tasks)
  const goals = useGoalsStore(s => s.goals)

  const totalRecords = habits.length + entries.length + workouts.length + meals.length + tasks.length + goals.length

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportResult(null)
    const result = await importData(file)
    setImportResult(result)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleRefreshAll = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        useHabitsStore.getState().fetchHabits(),
        useJournalStore.getState().fetchEntries(),
        useWorkoutsStore.getState().fetchWorkouts(),
        useMealsStore.getState().fetchMeals(),
        useTasksStore.getState().fetchTasks(),
        useGoalsStore.getState().fetchGoals(),
      ])
    } catch {} finally {
      setRefreshing(false)
    }
  }

  const formatBackupDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-accent" /> Settings
        </h1>
        <p className="text-text-muted text-xs mt-0.5">Manage your data and preferences</p>
      </div>

      {/* Profile */}
      <div className="card mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
            <span className="text-accent text-xl font-semibold">{user?.name?.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{user?.name}</h2>
            <p className="text-text-muted text-xs">{user?.email}</p>
            <p className="text-[10px] text-text-muted mt-0.5">Level {user?.level} · {user?.xp} XP</p>
          </div>
        </div>
      </div>

      {/* Data Overview */}
      <div className="card mb-4">
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
            { label: 'Goals', count: goals.length, color: 'text-accent' },
          ].map(d => (
            <div key={d.label} className="text-center p-2 bg-bg-elevated/50 rounded-lg">
              <p className={`text-lg font-bold ${d.color}`}>{d.count}</p>
              <p className="text-[9px] text-text-muted">{d.label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between p-3 bg-bg-elevated/50 rounded-lg">
          <div>
            <p className="text-sm font-medium">{totalRecords} total records</p>
            <p className="text-[10px] text-text-muted">Across all categories</p>
          </div>
          <button onClick={handleRefreshAll} disabled={refreshing}
            className="btn-ghost flex items-center gap-1.5 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
      </div>

      {/* Backup & Restore */}
      <div className="card mb-4">
        <h3 className="text-sm font-medium flex items-center gap-2 mb-1">
          <Shield className="w-4 h-4 text-accent" /> Backup & Restore
        </h3>
        <p className="text-[10px] text-text-muted mb-4">Export your entire life data as JSON. Import it on any device. Never lose anything.</p>

        {lastBackup && (
          <div className="flex items-center gap-2 p-2.5 bg-green-soft/5 border border-green-soft/10 rounded-lg mb-4">
            <CheckCircle2 className="w-4 h-4 text-green-soft shrink-0" />
            <div>
              <p className="text-[11px] text-green-soft font-medium">Last backup</p>
              <p className="text-[10px] text-text-muted">{formatBackupDate(lastBackup)}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Export */}
          <button onClick={exportData} disabled={isExporting}
            className="flex items-center gap-3 p-4 bg-bg-elevated rounded-lg hover:bg-bg-hover transition-all text-left group">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Download className={`w-5 h-5 text-accent ${isExporting ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <p className="text-sm font-medium group-hover:text-accent transition-colors">
                {isExporting ? 'Exporting...' : 'Export Backup'}
              </p>
              <p className="text-[10px] text-text-muted">Download all data as JSON file</p>
            </div>
          </button>

          {/* Import */}
          <label className="flex items-center gap-3 p-4 bg-bg-elevated rounded-lg hover:bg-bg-hover transition-all text-left group cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-blue-soft/10 flex items-center justify-center shrink-0">
              <Upload className={`w-5 h-5 text-blue-soft ${isImporting ? 'animate-bounce' : ''}`} />
            </div>
            <div>
              <p className="text-sm font-medium group-hover:text-blue-soft transition-colors">
                {isImporting ? 'Importing...' : 'Import Backup'}
              </p>
              <p className="text-[10px] text-text-muted">Restore from a JSON backup file</p>
            </div>
            <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" disabled={isImporting} />
          </label>
        </div>

        {/* Import Result */}
        <AnimatePresence>
          {importResult && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                importResult.success ? 'bg-green-soft/10 text-green-soft' : 'bg-red-soft/10 text-red-soft'
              }`}>
              {importResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <p className="text-xs">{importResult.message}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Data Safety Info */}
      <div className="card">
        <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
          <HardDrive className="w-4 h-4 text-accent" /> Data Safety
        </h3>
        <div className="space-y-3">
          {[
            { title: 'Cloud Synced', desc: 'All data is stored in MongoDB Atlas cloud. Accessible from any device.', icon: Cloud },
            { title: 'JSON Backups', desc: 'Export your full dataset anytime. Human-readable, portable format.', icon: Package },
            { title: 'Import Anywhere', desc: 'Restore backups on any LifeOS instance. Your data follows you.', icon: ArrowRightLeft },
            { title: 'No Data Lock-in', desc: 'Your data is always yours. Export and leave anytime.', icon: Unlock },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-3 p-3 bg-bg-elevated/50 rounded-lg">
              <item.icon className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-text-primary">{item.title}</p>
                <p className="text-[10px] text-text-muted">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="card mt-4">
        <h3 className="text-sm font-medium mb-3">Keyboard Shortcuts</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { keys: '⌘K', desc: 'Command palette' },
            { keys: '⌘1-9', desc: 'Navigate views' },
          ].map(s => (
            <div key={s.keys} className="flex items-center justify-between p-2 bg-bg-elevated/50 rounded-lg">
              <span className="text-[11px] text-text-muted">{s.desc}</span>
              <kbd className="kbd">{s.keys}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
