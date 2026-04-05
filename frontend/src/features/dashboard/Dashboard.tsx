'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore, useHabitsStore, useTasksStore, useGoalsStore, useWorkoutsStore, useMealsStore, useJournalStore, useSettingsStore } from '@/store'
import { getGreeting, getDayProgress, toISODate } from '@/lib/utils'
import { useAppStore } from '@/store'
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion'
import {
  Flame, CheckSquare, Target, Dumbbell, ArrowRight, Zap, TrendingUp,
  Calendar, Clock, BarChart3, Activity, Utensils, Brain, ChevronRight, BookOpen, Award, Sparkles, Check
} from 'lucide-react'
import { MoodIcon, HabitIcon } from '@/lib/icons'

function AnimatedNumber({ value, duration = 1 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const motionVal = useMotionValue(0)
  const rounded = useTransform(motionVal, (v) => Math.round(v))
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (isInView) {
      const ctrl = animate(motionVal, value, { duration, ease: [0.16, 1, 0.3, 1] })
      return ctrl.stop
    }
  }, [isInView, value, duration, motionVal])

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => {
      if (ref.current) ref.current.textContent = String(v)
    })
    return unsubscribe
  }, [rounded])

  return <span ref={ref}>0</span>
}

function GlowRing({ percent, size = 56, strokeWidth = 3.5, color = '#e8d5b7' }: { percent: number; size?: number; strokeWidth?: number; color?: string }) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  return (
    <div className="relative glow-ring" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (percent / 100) * circumference }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-accent">
        <AnimatedNumber value={percent} duration={1.2} />%
      </span>
    </div>
  )
}

export function Dashboard() {
  const { user } = useAuthStore()
  const { habits, fetchHabits } = useHabitsStore()
  const { tasks, fetchTasks } = useTasksStore()
  const { goals, fetchGoals } = useGoalsStore()
  const { workouts, fetchWorkouts } = useWorkoutsStore()
  const { meals, fetchMeals } = useMealsStore()
  const { entries, fetchEntries } = useJournalStore()
  const { setActiveView } = useAppStore()
  const [mounted, setMounted] = useState(false)
  const userGoals = useSettingsStore(s => s.goals)

  const today = toISODate()
  const dayProgress = getDayProgress()

  useEffect(() => {
    fetchHabits().catch(() => {})
    fetchTasks().catch(() => {})
    fetchGoals().catch(() => {})
    fetchWorkouts().catch(() => {})
    fetchMeals(today).catch(() => {})
    fetchEntries().catch(() => {})
    setMounted(true)
  // Dashboard silently ignores load errors — data will simply be empty
  }, [fetchHabits, fetchTasks, fetchGoals, fetchWorkouts, fetchMeals, fetchEntries, today])

  const completedHabitsToday = habits.filter((h) => (h.completedDates || []).includes(today)).length
  const totalHabits = habits.length
  const habitPercent = totalHabits > 0 ? Math.round((completedHabitsToday / totalHabits) * 100) : 0
  const todoTasks = tasks.filter((t) => t.status === 'todo').length
  const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length
  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const activeGoals = goals.filter((g) => g.status === 'active').length
  const completedGoals = goals.filter((g) => g.status === 'completed').length
  const todayWorkouts = workouts.filter((w) => w.date === today)
  const todayCalories = meals.reduce((sum, m) => sum + m.calories, 0)
  const todayProtein = meals.reduce((sum, m) => sum + m.protein, 0)
  const todayCarbs = meals.reduce((sum, m) => sum + m.carbs, 0)
  const todayFat = meals.reduce((sum, m) => sum + m.fat, 0)
  const bestStreak = habits.length > 0 ? Math.max(0, ...habits.map((h) => h.streak || 0)) : 0
  const totalStreaks = habits.reduce((s, h) => s + (h.streak || 0), 0)

  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); return toISODate(d)
  }), [])

  const weeklyHabitData = useMemo(() => last7Days.map(date => {
    const completed = habits.filter(h => (h.completedDates || []).includes(date)).length
    return { date, completed, total: totalHabits }
  }), [last7Days, habits, totalHabits])

  const weeklyWorkoutCount = workouts.filter(w => last7Days.includes(w.date)).length
  const weeklyJournalCount = entries.filter(e => last7Days.includes(typeof e.date === 'string' ? e.date : toISODate(new Date(e.date)))).length

  const urgentTasks = tasks.filter(t => t.status !== 'done' && (t.priority === 'urgent' || t.priority === 'high'))

  const todayEntry = entries.find(e => {
    const d = typeof e.date === 'string' ? e.date : toISODate(new Date(e.date))
    return d === today
  })

  const closestGoal = useMemo(() => {
    const active = goals.filter(g => g.status === 'active' && g.target > 0)
    if (active.length === 0) return null
    return active.reduce((best, g) => {
      const pct = (g.progress / g.target) * 100
      const bestPct = (best.progress / best.target) * 100
      return pct > bestPct ? g : best
    })
  }, [goals])

  const xpPercent = user ? Math.min(100, (user.xp / (user.level * 100)) * 100) : 0
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Daily Score — composite of habits, tasks done, journal, workout
  const dailyScore = useMemo(() => {
    let score = 0, max = 0
    // Habits: up to 40 points
    if (totalHabits > 0) { score += (completedHabitsToday / totalHabits) * 40; max += 40 }
    // Tasks: up to 20 points (based on today's done tasks)
    const tasksDoneToday = tasks.filter(t => t.status === 'done').length
    const totalTasks = tasks.length
    if (totalTasks > 0) { score += Math.min(1, tasksDoneToday / Math.max(totalTasks, 1)) * 20; max += 20 }
    // Journal: 20 points if written today
    if (todayEntry) { score += 20 }
    max += 20
    // Workout: 20 points if worked out today
    if (todayWorkouts.length > 0) { score += 20 }
    max += 20
    return max > 0 ? Math.round((score / max) * 100) : 0
  }, [completedHabitsToday, totalHabits, tasks, todayEntry, todayWorkouts])

  const stagger = {
    container: {
      animate: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
    },
    item: {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
    },
  }

  const stats = [
    { label: 'Habits Done', value: completedHabitsToday, total: totalHabits, sub: `${habitPercent}% complete`, icon: Flame, color: '#fb923c', glow: 'rgba(251, 146, 60, 0.15)', view: 'habits' },
    { label: 'Open Tasks', value: todoTasks + inProgressTasks, total: null, sub: `${doneTasks} done · ${inProgressTasks} active`, icon: CheckSquare, color: '#34d399', glow: 'rgba(52, 211, 153, 0.15)', view: 'tasks' },
    { label: 'Active Goals', value: activeGoals, total: null, sub: `${completedGoals} completed`, icon: Target, color: '#60a5fa', glow: 'rgba(96, 165, 250, 0.15)', view: 'goals' },
    { label: 'Best Streak', value: bestStreak, total: null, sub: `${totalStreaks} total streak days`, icon: TrendingUp, color: '#e8d5b7', glow: 'rgba(232, 213, 183, 0.15)', view: 'habits' },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Greeting */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.h1
          className="text-3xl md:text-4xl font-bold tracking-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          {getGreeting()}, <span className="gradient-text">{user?.name?.split(' ')[0] || 'User'}</span>
        </motion.h1>
        <motion.p
          className="text-text-muted text-sm mt-2 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
          <span className="w-1 h-1 rounded-full bg-text-muted/50" />
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {dayProgress}% through the day
          </span>
        </motion.p>
      </motion.div>

      {/* Day Progress + Daily Score + XP */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6"
        variants={stagger.container}
        initial="initial"
        animate="animate"
      >
        {/* Daily Score Ring */}
        <motion.div variants={stagger.item} className="card flex items-center gap-4">
          <GlowRing percent={dailyScore} size={72} strokeWidth={4.5} color={dailyScore >= 80 ? '#34d399' : dailyScore >= 50 ? '#fb923c' : '#fb7185'} />
          <div>
            <p className="text-sm font-semibold text-text-primary">Daily Score</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {dailyScore >= 80 ? 'Crushing it!' : dailyScore >= 50 ? 'Good progress' : 'Keep going'}
            </p>
            <div className="flex gap-2 mt-1.5">
              {[
                { done: completedHabitsToday > 0, label: 'Habits' },
                { done: todayWorkouts.length > 0, label: 'Gym' },
                { done: !!todayEntry, label: 'Journal' },
                { done: tasks.filter(t => t.status === 'done').length > 0, label: 'Tasks' },
              ].map(item => (
                <span key={item.label} className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                  item.done ? 'bg-green-soft/10 text-green-soft' : 'bg-white/[0.04] text-text-muted'
                }`}>{item.label}</span>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div variants={stagger.item} className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(232, 213, 183, 0.1)', boxShadow: '0 0 12px -2px rgba(232, 213, 183, 0.15)' }}>
                <Activity className="w-4 h-4 text-accent" />
              </div>
              <span className="text-sm font-medium text-text-primary">Day Progress</span>
            </div>
            <span className="text-xs text-text-muted font-medium"><AnimatedNumber value={dayProgress} />%</span>
          </div>
          <div className="h-2.5 bg-bg-elevated rounded-full overflow-hidden relative">
            <motion.div
              className="h-full rounded-full relative"
              style={{ background: 'linear-gradient(90deg, #c9a87c, #e8d5b7, #f0dfc4)' }}
              initial={{ width: 0 }}
              animate={{ width: `${dayProgress}%` }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            >
            </motion.div>
          </div>
        </motion.div>

        {user && (
          <motion.div variants={stagger.item} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(167, 139, 250, 0.1)', boxShadow: '0 0 12px -2px rgba(167, 139, 250, 0.15)' }}>
                  <Zap className="w-4 h-4 text-purple-soft" />
                </div>
                <span className="text-sm font-medium text-text-primary">Level {user.level}</span>
                <span className="badge text-xs">{user.xp} XP</span>
              </div>
              <span className="text-xs text-text-muted">{user.level * 100 - user.xp} XP to next</span>
            </div>
            <div className="h-2.5 bg-bg-elevated rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #c4b5fd)' }}
                initial={{ width: 0 }}
                animate={{ width: `${xpPercent}%` }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        variants={stagger.container}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
      >
        {stats.map((stat) => (
          <motion.button
            key={stat.label}
            variants={stagger.item}
            onClick={() => setActiveView(stat.view)}
            className="stat-card text-left group"
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{
                background: `rgba(${stat.color === '#fb923c' ? '251,146,60' : stat.color === '#34d399' ? '52,211,153' : stat.color === '#60a5fa' ? '96,165,250' : '232,213,183'}, 0.1)`,
                boxShadow: `0 0 20px -4px ${stat.glow}`,
              }}
            >
              <stat.icon className="w-4.5 h-4.5" style={{ color: stat.color }} />
            </div>
            <p className="text-3xl font-bold text-text-primary tracking-tight">
              <AnimatedNumber value={stat.value} />
              {stat.total !== null && <span className="text-sm font-normal text-text-muted">/{stat.total}</span>}
            </p>
            <p className="text-xs text-text-secondary mt-1.5">{stat.sub}</p>
            <p className="text-xs text-accent mt-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
              {stat.label} <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </motion.button>
        ))}
      </motion.div>

      {/* Weekly Chart */}
      <motion.div
        className="card mb-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(232, 213, 183, 0.1)' }}>
              <BarChart3 className="w-4 h-4 text-accent" />
            </div>
            <span className="text-sm font-medium text-text-primary">This Week</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent inline-block" style={{ boxShadow: '0 0 6px rgba(232, 213, 183, 0.4)' }} /> Habits</span>
            <span>{weeklyWorkoutCount} workouts</span>
            <span>{weeklyJournalCount} journals</span>
          </div>
        </div>
        <div className="flex items-end gap-2 h-28">
          {weeklyHabitData.map(({ date, completed, total }, idx) => {
            const pct = total > 0 ? (completed / total) * 100 : 0
            const isToday = date === today
            const dayIdx = new Date(date + 'T12:00:00').getDay()
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs text-text-muted">{completed}/{total}</span>
                <div className="w-full rounded-lg overflow-hidden relative" style={{ height: '72px', background: 'rgba(255,255,255,0.08)' }}>
                  <motion.div
                    className="w-full rounded-lg absolute bottom-0"
                    style={{
                      background: isToday
                        ? 'linear-gradient(180deg, #e8d5b7, #c9a87c)'
                        : 'linear-gradient(180deg, rgba(232, 213, 183, 0.4), rgba(232, 213, 183, 0.2))',
                      boxShadow: isToday ? '0 0 16px -4px rgba(232, 213, 183, 0.4)' : 'none',
                    }}
                    initial={{ height: 0 }}
                    animate={{ height: `${pct}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.5 + idx * 0.05 }}
                  />
                </div>
                <span className={`text-xs ${isToday ? 'text-accent font-bold' : 'text-text-muted'}`}>{dayNames[dayIdx]}</span>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {/* Habits */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-soft" /> Today&apos;s Habits
            </span>
            <button onClick={() => setActiveView('habits')} className="text-accent text-xs hover:underline flex items-center gap-0.5 group">
              All <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <GlowRing percent={habitPercent} size={60} />
            <div>
              <p className="text-sm font-medium text-text-primary">{completedHabitsToday} of {totalHabits} done</p>
              <p className="text-xs text-text-muted">{totalHabits - completedHabitsToday} remaining</p>
            </div>
          </div>
          {habits.length === 0 ? (
            <p className="text-text-muted text-sm py-4 text-center">No habits yet</p>
          ) : (
            <div className="space-y-1">
              {habits.map((habit, idx) => {
                const done = (habit.completedDates || []).includes(today)
                return (
                  <motion.div
                    key={habit._id}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + idx * 0.04, duration: 0.3 }}
                    whileHover={{ background: 'rgba(255,255,255,0.09)' }}
                  >
                    <motion.div
                      className="w-1.5 h-5 rounded-full shrink-0"
                      style={{
                        backgroundColor: done ? '#4ade80' : 'rgba(255,255,255,0.06)',
                        boxShadow: done ? '0 0 8px rgba(74, 222, 128, 0.4)' : 'none',
                      }}
                    />
                    <span className="text-sm"><HabitIcon iconId={habit.icon} size={16} /></span>
                    <span className={`text-sm flex-1 ${done ? 'line-through text-text-muted' : 'text-text-primary'}`}>{habit.name}</span>
                    {done ? (
                      <motion.span
                        className="text-green-soft text-xs font-bold"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                      ><Check size={14} className="text-green-soft" /></motion.span>
                    ) : (
                      <span className="text-xs text-text-muted">pending</span>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Nutrition */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5"><Utensils className="w-3.5 h-3.5 text-accent" /> Nutrition</span>
            <button onClick={() => setActiveView('diet')} className="text-accent text-xs hover:underline flex items-center gap-0.5 group">Log meal <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" /></button>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Calories', value: todayCalories, max: userGoals.calories, unit: 'kcal', color: '#e8d5b7', glow: 'rgba(232, 213, 183, 0.3)' },
              { label: 'Protein', value: todayProtein, max: userGoals.protein, unit: 'g', color: '#34d399', glow: 'rgba(52, 211, 153, 0.3)' },
              { label: 'Carbs', value: todayCarbs, max: userGoals.carbs, unit: 'g', color: '#60a5fa', glow: 'rgba(96, 165, 250, 0.3)' },
              { label: 'Fat', value: todayFat, max: userGoals.fat, unit: 'g', color: '#fb923c', glow: 'rgba(251, 146, 60, 0.3)' },
            ].map((m, idx) => (
              <div key={m.label}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-text-secondary">{m.label}</span>
                  <span className="text-xs text-text-primary font-medium">
                    <AnimatedNumber value={m.value} duration={0.8} /> <span className="text-text-muted">/ {m.max}{m.unit}</span>
                  </span>
                </div>
                <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${m.color}88, ${m.color})`,
                      boxShadow: m.value > 0 ? `0 0 12px -2px ${m.glow}` : 'none',
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (m.value / m.max) * 100)}%` }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.5 + idx * 0.1 }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {meals.length} meal{meals.length !== 1 ? 's' : ''} logged today
          </p>
        </motion.div>

        {/* Gym */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5"><Dumbbell className="w-3.5 h-3.5 text-blue-soft" /> Gym</span>
            <button onClick={() => setActiveView('gym')} className="text-accent text-xs hover:underline flex items-center gap-0.5 group">Log workout <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" /></button>
          </div>
          {todayWorkouts.length === 0 ? (
            <div className="text-center py-8">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Dumbbell className="w-10 h-10 text-text-muted mx-auto mb-3" />
              </motion.div>
              <p className="text-sm text-text-muted mb-3">No workouts today</p>
              <motion.button
                onClick={() => setActiveView('gym')}
                className="btn text-xs"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Sparkles className="w-3.5 h-3.5" /> Log Workout
              </motion.button>
            </div>
          ) : (
            <div className="space-y-2">
              {todayWorkouts.map((w) => {
                const vol = w.exercises.reduce((s: number, ex: { sets: { reps: number; weight: number }[] }) => s + ex.sets.reduce((ss: number, set: { reps: number; weight: number }) => ss + set.reps * set.weight, 0), 0)
                return (
                  <motion.div
                    key={w._id}
                    className="rounded-xl p-3 bg-bg-elevated border border-border"
                    whileHover={{ background: 'rgba(255,255,255,0.12)' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-text-primary">{w.name}</span>
                      <span className="text-xs text-text-muted">{w.duration}min</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      <span>{w.exercises.length} exercises</span>
                      <span>{vol.toLocaleString()}kg vol</span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Tasks & Goals */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5"><CheckSquare className="w-3.5 h-3.5 text-green-soft" /> Tasks & Goals</span>
            <button onClick={() => setActiveView('tasks')} className="text-accent text-xs hover:underline flex items-center gap-0.5 group">All <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" /></button>
          </div>
          {urgentTasks.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-red-soft font-semibold mb-2 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-soft pulse-dot" /> Priority
              </p>
              {urgentTasks.slice(0, 3).map((t) => (
                <motion.div
                  key={t._id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                  whileHover={{ background: 'rgba(255,255,255,0.09)' }}
                >
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.priority === 'urgent' ? 'bg-red-soft' : 'bg-orange-soft'}`}
                    style={{ boxShadow: `0 0 6px ${t.priority === 'urgent' ? 'rgba(251,113,133,0.4)' : 'rgba(251,146,60,0.4)'}` }}
                  />
                  <span className="text-sm text-text-primary flex-1 truncate">{t.title}</span>
                  <span className="badge text-xs">{t.status}</span>
                </motion.div>
              ))}
            </div>
          )}
          {closestGoal && (
            <div className="rounded-xl p-3 bg-bg-elevated border border-border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-muted flex items-center gap-1"><Target className="w-3 h-3 text-blue-soft" /> Closest goal</span>
                <span className="text-xs font-bold text-accent">{Math.round((closestGoal.progress / closestGoal.target) * 100)}%</span>
              </div>
              <p className="text-sm font-medium text-text-primary">{closestGoal.title}</p>
              <div className="h-2 bg-bg-surface rounded-full overflow-hidden mt-2">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #60a5fa, #93c5fd)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (closestGoal.progress / closestGoal.target) * 100)}%` }}
                  transition={{ duration: 1, delay: 0.7 }}
                />
              </div>
              <p className="text-xs text-text-muted mt-1.5">{closestGoal.progress}/{closestGoal.target} {closestGoal.unit}</p>
            </div>
          )}
          <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-text-muted">{todoTasks} todo</span>
              <span className="text-blue-soft">{inProgressTasks} active</span>
              <span className="text-green-soft">{doneTasks} done</span>
            </div>
            <span className="text-xs text-text-muted">{activeGoals} active goals</span>
          </div>
        </motion.div>
      </div>

      {/* Journal */}
      <motion.div
        className="card mb-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-text-secondary flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-purple-soft" /> Journal</span>
          <button onClick={() => setActiveView('journal')} className="text-accent text-xs hover:underline flex items-center gap-0.5 group">
            {todayEntry ? 'Edit' : 'Write'} entry <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
        {todayEntry ? (
          <motion.div
            className="rounded-xl p-4 bg-bg-elevated border border-border"
            whileHover={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg"><MoodIcon mood={todayEntry.mood || 3} size={22} /></span>
              <span className="text-sm font-medium text-text-primary">{todayEntry.title || "Today's Entry"}</span>
            </div>
            <p className="text-xs text-text-secondary line-clamp-2">{todayEntry.content?.replace(/<[^>]*>/g, '').slice(0, 150) || 'No content'}</p>
            {todayEntry.tags?.length > 0 && (
              <div className="flex gap-1 mt-2">{todayEntry.tags.map((t: string) => <span key={t} className="badge text-xs">{t}</span>)}</div>
            )}
          </motion.div>
        ) : (
          <div className="text-center py-8">
            <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}>
              <BookOpen className="w-10 h-10 text-text-muted mx-auto mb-3" />
            </motion.div>
            <p className="text-sm text-text-muted mb-3">No journal entry today</p>
            <motion.button onClick={() => setActiveView('journal')} className="btn text-xs" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Sparkles className="w-3.5 h-3.5" /> Write Entry
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Bottom Stats */}
      <motion.div
        className="grid grid-cols-3 gap-3 mb-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {[
          { icon: Award, label: 'Workouts this week', value: weeklyWorkoutCount, color: '#e8d5b7', glow: 'rgba(232, 213, 183, 0.12)' },
          { icon: BookOpen, label: 'Journal this week', value: weeklyJournalCount, color: '#a78bfa', glow: 'rgba(167, 139, 250, 0.12)' },
          { icon: Activity, label: 'Total entries', value: entries.length, color: '#34d399', glow: 'rgba(52, 211, 153, 0.12)' },
        ].map((s) => (
          <motion.div
            key={s.label}
            className="card text-center hover-glow"
            whileHover={{ y: -2 }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2"
              style={{ background: `${s.glow}`, boxShadow: `0 0 16px -4px ${s.glow}` }}
            >
              <s.icon className="w-5 h-5" style={{ color: s.color }} />
            </div>
            <p className="text-xl font-bold text-text-primary"><AnimatedNumber value={s.value} /></p>
            <p className="text-xs text-text-muted mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
