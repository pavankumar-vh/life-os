'use client'

import { useEffect } from 'react'
import { useAuthStore, useHabitsStore, useTasksStore, useGoalsStore, useWorkoutsStore, useMealsStore } from '@/store'
import { getGreeting, getDayProgress, toISODate, getStreakEmoji } from '@/lib/utils'
import { useAppStore } from '@/store'
import { motion } from 'framer-motion'
import { Flame, CheckSquare, Target, Dumbbell, Apple, BookOpen, ArrowRight, Zap, TrendingUp } from 'lucide-react'

export function Dashboard() {
  const { user } = useAuthStore()
  const { habits, fetchHabits } = useHabitsStore()
  const { tasks, fetchTasks } = useTasksStore()
  const { goals, fetchGoals } = useGoalsStore()
  const { workouts, fetchWorkouts } = useWorkoutsStore()
  const { meals, fetchMeals } = useMealsStore()
  const { setActiveView } = useAppStore()

  const today = toISODate()
  const dayProgress = getDayProgress()

  useEffect(() => {
    fetchHabits().catch(() => {})
    fetchTasks().catch(() => {})
    fetchGoals().catch(() => {})
    fetchWorkouts().catch(() => {})
    fetchMeals(today).catch(() => {})
  }, [fetchHabits, fetchTasks, fetchGoals, fetchWorkouts, fetchMeals, today])

  const completedHabitsToday = habits.filter((h) => h.completedDates.includes(today)).length
  const totalHabits = habits.length
  const todoTasks = tasks.filter((t) => t.status !== 'done').length
  const doneTasks = tasks.filter((t) => t.status === 'done').length
  const activeGoals = goals.filter((g) => g.status === 'active').length
  const todayWorkouts = workouts.filter((w) => w.date === today).length
  const todayCalories = meals.reduce((sum, m) => sum + m.calories, 0)
  const bestStreak = Math.max(0, ...habits.map((h) => h.streak))

  const stagger = {
    container: { transition: { staggerChildren: 0.05 } },
    item: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } },
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-black tracking-tight">
          {getGreeting()}, <span className="text-brutal-yellow">{user?.name?.split(' ')[0]}</span>
        </h1>
        <p className="text-text-muted font-mono text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Day Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-xs text-text-muted uppercase tracking-wider">Day Progress</span>
          <span className="font-mono text-xs text-brutal-yellow">{dayProgress}%</span>
        </div>
        <div className="h-2 bg-bg-elevated border-2 border-border-strong">
          <motion.div
            className="h-full bg-brutal-yellow"
            initial={{ width: 0 }}
            animate={{ width: `${dayProgress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* XP Bar */}
      {user && (
        <div className="border-3 border-brutal-purple bg-bg-surface p-4 mb-8 shadow-brutal-purple">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-brutal-purple" />
              <span className="font-mono text-sm font-bold">Level {user.level}</span>
            </div>
            <span className="font-mono text-xs text-text-muted">{user.xp} / {user.level * 100} XP</span>
          </div>
          <div className="h-3 bg-bg-elevated border-2 border-border-strong">
            <div
              className="h-full bg-brutal-purple transition-all duration-500"
              style={{ width: `${Math.min(100, (user.xp / (user.level * 100)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <motion.div
        variants={stagger.container}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8"
      >
        {[
          {
            label: 'Habits',
            value: `${completedHabitsToday}/${totalHabits}`,
            icon: Flame,
            color: 'brutal-yellow',
            borderColor: 'border-brutal-yellow',
            shadow: 'shadow-brutal',
            view: 'habits',
          },
          {
            label: 'Tasks',
            value: `${doneTasks}/${doneTasks + todoTasks}`,
            icon: CheckSquare,
            color: 'brutal-green',
            borderColor: 'border-brutal-green',
            shadow: 'shadow-brutal-green',
            view: 'tasks',
          },
          {
            label: 'Goals',
            value: activeGoals.toString(),
            icon: Target,
            color: 'brutal-blue',
            borderColor: 'border-brutal-blue',
            shadow: 'shadow-brutal-blue',
            view: 'goals',
          },
          {
            label: 'Streak',
            value: `${bestStreak}${getStreakEmoji(bestStreak)}`,
            icon: TrendingUp,
            color: 'brutal-orange',
            borderColor: 'border-brutal-orange',
            shadow: 'shadow-[4px_4px_0px_0px_#F97316]',
            view: 'habits',
          },
        ].map((stat) => (
          <motion.button
            key={stat.label}
            variants={stagger.item}
            onClick={() => setActiveView(stat.view)}
            className={`bg-bg-surface border-3 ${stat.borderColor} ${stat.shadow} p-4 text-left
                       hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all cursor-pointer group`}
          >
            <stat.icon className={`w-5 h-5 text-${stat.color} mb-2`} />
            <p className="stat-number text-2xl">{stat.value}</p>
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest mt-1 flex items-center gap-1">
              {stat.label}
              <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </motion.button>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Today's Habits */}
        <div className="border-3 border-border bg-bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-xs uppercase tracking-widest text-text-muted">Today&apos;s Habits</h3>
            <button onClick={() => setActiveView('habits')} className="text-brutal-yellow text-xs font-mono hover:underline">
              View all →
            </button>
          </div>
          {habits.length === 0 ? (
            <p className="text-text-muted font-mono text-sm py-4 text-center">No habits yet</p>
          ) : (
            <div className="space-y-2">
              {habits.slice(0, 5).map((habit) => {
                const done = habit.completedDates.includes(today)
                return (
                  <div
                    key={habit._id}
                    className={`flex items-center gap-3 p-2 border-2 transition-colors ${
                      done ? 'border-brutal-green bg-brutal-green/5' : 'border-border'
                    }`}
                  >
                    <span className="text-lg">{habit.icon}</span>
                    <span className={`font-mono text-sm flex-1 ${done ? 'line-through text-text-muted' : ''}`}>
                      {habit.name}
                    </span>
                    {done && <span className="text-brutal-green text-xs">✓</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Today's Nutrition */}
        <div className="border-3 border-border bg-bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-xs uppercase tracking-widest text-text-muted">Nutrition</h3>
            <button onClick={() => setActiveView('diet')} className="text-brutal-yellow text-xs font-mono hover:underline">
              View all →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Calories', value: todayCalories, unit: 'kcal', color: 'text-brutal-yellow' },
              { label: 'Protein', value: meals.reduce((s, m) => s + m.protein, 0), unit: 'g', color: 'text-brutal-green' },
              { label: 'Carbs', value: meals.reduce((s, m) => s + m.carbs, 0), unit: 'g', color: 'text-brutal-blue' },
              { label: 'Fat', value: meals.reduce((s, m) => s + m.fat, 0), unit: 'g', color: 'text-brutal-orange' },
            ].map((macro) => (
              <div key={macro.label} className="text-center py-2">
                <p className={`font-display text-xl font-bold ${macro.color}`}>{macro.value}</p>
                <p className="font-mono text-[10px] text-text-muted uppercase">{macro.unit} {macro.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Workout */}
        <div className="border-3 border-border bg-bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-xs uppercase tracking-widest text-text-muted">Gym</h3>
            <button onClick={() => setActiveView('gym')} className="text-brutal-yellow text-xs font-mono hover:underline">
              View all →
            </button>
          </div>
          <div className="flex flex-col items-center py-4 gap-2">
            <Dumbbell className="w-8 h-8 text-text-muted" />
            <p className="font-mono text-sm text-text-secondary">
              {todayWorkouts > 0 ? `${todayWorkouts} workout${todayWorkouts > 1 ? 's' : ''} today` : 'No workouts today'}
            </p>
            <button onClick={() => setActiveView('gym')} className="brutal-btn text-xs mt-2">
              Log Workout
            </button>
          </div>
        </div>
      </div>

      {/* Pending Tasks */}
      <div className="border-3 border-border bg-bg-surface p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-xs uppercase tracking-widest text-text-muted">Open Tasks</h3>
          <button onClick={() => setActiveView('tasks')} className="text-brutal-yellow text-xs font-mono hover:underline">
            View all →
          </button>
        </div>
        {tasks.filter((t) => t.status !== 'done').length === 0 ? (
          <p className="text-text-muted font-mono text-sm py-4 text-center">All clear! 🎯</p>
        ) : (
          <div className="space-y-2">
            {tasks
              .filter((t) => t.status !== 'done')
              .slice(0, 5)
              .map((task) => (
                <div key={task._id} className="flex items-center gap-3 p-2 border-2 border-border">
                  <div className={`w-2 h-2 rounded-full ${
                    task.priority === 'urgent' ? 'bg-brutal-red' :
                    task.priority === 'high' ? 'bg-brutal-orange' :
                    task.priority === 'medium' ? 'bg-brutal-yellow' : 'bg-text-muted'
                  }`} />
                  <span className="font-mono text-sm flex-1">{task.title}</span>
                  <span className={`brutal-badge text-[8px] ${
                    task.status === 'in-progress' ? 'text-brutal-blue' : 'text-text-muted'
                  }`}>
                    {task.status}
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
