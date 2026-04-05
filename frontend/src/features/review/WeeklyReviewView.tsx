'use client'

import { useEffect, useMemo } from 'react'
import { useHabitsStore, useJournalStore, useWorkoutsStore, useMealsStore, useTasksStore, useGoalsStore, useSleepTrackerStore, useBodyTrackerStore } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { MOTIVATIONAL_QUOTES } from '@/lib/quotes'
import { BarChart3, Flame, BookOpen, Dumbbell, CheckSquare, Target, Moon, Scale, TrendingUp, Award, Quote } from 'lucide-react'
import { MoodIcon, HabitIcon, MOOD_LABELS } from '@/lib/icons'

function getWeekDates() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const start = new Date(now)
  start.setDate(diff)
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return toISODate(d)
  })
  return { start: dates[0], end: dates[6], dates }
}

export function WeeklyReviewView() {
  const habits = useHabitsStore(s => s.habits)
  const entries = useJournalStore(s => s.entries)
  const workouts = useWorkoutsStore(s => s.workouts)
  const meals = useMealsStore(s => s.meals)
  const tasks = useTasksStore(s => s.tasks)
  const goals = useGoalsStore(s => s.goals)
  const sleepLogs = useSleepTrackerStore(s => s.logs)
  const bodyLogs = useBodyTrackerStore(s => s.logs)

  useEffect(() => {
    useHabitsStore.getState().fetchHabits().catch(() => {})
    useJournalStore.getState().fetchEntries().catch(() => {})
    useWorkoutsStore.getState().fetchWorkouts().catch(() => {})
    useTasksStore.getState().fetchTasks().catch(() => {})
    useGoalsStore.getState().fetchGoals().catch(() => {})
    useSleepTrackerStore.getState().fetchLogs().catch(() => {})
    useBodyTrackerStore.getState().fetchLogs().catch(() => {})
  }, [])

  const week = getWeekDates()

  const reviewData = useMemo(() => {
    // Habits
    const habitCompletions = habits.map(h => {
      const weekCompleted = week.dates.filter(d => (h.completedDates || []).includes(d)).length
      return { name: h.name, icon: h.icon, completed: weekCompleted, total: 7, rate: Math.round((weekCompleted / 7) * 100) }
    })
    const overallHabitRate = habitCompletions.length > 0
      ? Math.round(habitCompletions.reduce((s, h) => s + h.rate, 0) / habitCompletions.length) : 0

    // Journal
    const weekJournals = entries.filter(e => week.dates.includes(e.date))
    const avgMood = weekJournals.length > 0
      ? +(weekJournals.reduce((s, e) => s + e.mood, 0) / weekJournals.length).toFixed(1) : 0
    const moodTrend = weekJournals.length >= 2
      ? weekJournals[0].mood - weekJournals[weekJournals.length - 1].mood : 0

    // Workouts
    const weekWorkouts = workouts.filter(w => week.dates.includes(w.date))
    const totalVolume = weekWorkouts.reduce((s, w) =>
      s + w.exercises.reduce((es, ex) =>
        es + ex.sets.reduce((ss, set) => ss + set.reps * set.weight, 0), 0), 0)
    const totalDuration = weekWorkouts.reduce((s, w) => s + w.duration, 0)

    // Tasks
    const weekCompleted = tasks.filter(t => t.status === 'done').length
    const weekTotal = tasks.length
    const taskRate = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0

    // Goals
    const activeGoals = goals.filter(g => g.status === 'active')
    const avgGoalProgress = activeGoals.length > 0
      ? Math.round(activeGoals.reduce((s, g) => s + (g.progress / g.target) * 100, 0) / activeGoals.length) : 0

    // Sleep
    const weekSleep = sleepLogs.filter(l => week.dates.includes(l.date))
    const avgSleep = weekSleep.length > 0
      ? +(weekSleep.reduce((s, l) => s + l.hours, 0) / weekSleep.length).toFixed(1) : 0
    const avgSleepQuality = weekSleep.length > 0
      ? +(weekSleep.reduce((s, l) => s + l.quality, 0) / weekSleep.length).toFixed(1) : 0

    // Body
    const latestBody = bodyLogs.length > 0 ? bodyLogs[0] : null

    // Life Score (0-100 based on habits, tasks, mood, sleep, workouts)
    const habitScore = overallHabitRate * 0.3
    const taskScore = taskRate * 0.2
    const moodScore = (avgMood / 5) * 100 * 0.15
    const sleepScore = (Math.min(avgSleep, 8) / 8) * 100 * 0.2
    const workoutScore = Math.min(weekWorkouts.length / 4, 1) * 100 * 0.15
    const lifeScore = Math.round(habitScore + taskScore + moodScore + sleepScore + workoutScore)

    return {
      habitCompletions, overallHabitRate,
      weekJournals, avgMood, moodTrend,
      weekWorkouts, totalVolume, totalDuration,
      weekCompleted, weekTotal, taskRate,
      activeGoals, avgGoalProgress,
      avgSleep, avgSleepQuality, weekSleep,
      latestBody,
      lifeScore,
    }
  }, [habits, entries, workouts, tasks, goals, sleepLogs, bodyLogs, week])

  // Quote of the day (deterministic per day)
  const quote = MOTIVATIONAL_QUOTES[new Date().getDate() % MOTIVATIONAL_QUOTES.length]

  const lifeScoreColor = reviewData.lifeScore >= 70 ? 'text-green-soft' : reviewData.lifeScore >= 40 ? 'text-accent' : 'text-red-soft'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-accent" /> Weekly Review
        </h1>
        <p className="text-text-muted text-xs mt-0.5">{formatDate(week.start)} – {formatDate(week.end)}</p>
      </div>

      {/* Quote */}
      <div className="card mb-6 border-accent/10 bg-gradient-to-br from-bg-surface to-bg-elevated/50">
        <div className="flex items-start gap-3">
          <Quote className="w-5 h-5 text-accent/50 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-text-primary italic leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
            <p className="text-xs text-text-muted mt-1">— {quote.author}</p>
          </div>
        </div>
      </div>

      {/* Life Score */}
      <div className="card mb-6 text-center">
        <Award className="w-6 h-6 text-accent mx-auto mb-2" />
        <p className={`text-5xl font-bold ${lifeScoreColor}`}>{reviewData.lifeScore}</p>
        <p className="text-xs text-text-muted mt-1">Life Score this week</p>
        <div className="h-2 bg-bg-elevated rounded-full overflow-hidden mt-3 max-w-xs mx-auto">
          <div className={`h-full rounded-full transition-all duration-700 ${
            reviewData.lifeScore >= 70 ? 'bg-green-soft' : reviewData.lifeScore >= 40 ? 'bg-accent' : 'bg-red-soft'
          }`} style={{ width: `${reviewData.lifeScore}%` }} />
        </div>
        <p className="text-[11px] text-text-secondary mt-2">Based on habits, tasks, mood, sleep & workouts</p>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card text-center">
          <Flame className="w-4 h-4 text-accent mx-auto mb-1" />
          <p className="text-2xl font-bold text-accent">{reviewData.overallHabitRate}%</p>
          <p className="text-[11px] text-text-secondary">Habit Rate</p>
        </div>
        <div className="card text-center">
          <Dumbbell className="w-4 h-4 text-green-soft mx-auto mb-1" />
          <p className="text-2xl font-bold text-green-soft">{reviewData.weekWorkouts.length}</p>
          <p className="text-[11px] text-text-secondary">Workouts</p>
        </div>
        <div className="card text-center">
          <CheckSquare className="w-4 h-4 text-blue-soft mx-auto mb-1" />
          <p className="text-2xl font-bold text-blue-soft">{reviewData.taskRate}%</p>
          <p className="text-[11px] text-text-secondary">Tasks Done</p>
        </div>
        <div className="card text-center">
          <Moon className="w-4 h-4 text-purple-soft mx-auto mb-1" />
          <p className="text-2xl font-bold text-purple-soft">{reviewData.avgSleep}h</p>
          <p className="text-[11px] text-text-secondary">Avg Sleep</p>
        </div>
      </div>

      {/* Habits Breakdown */}
      <div className="card mb-4">
        <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-accent" /> Habits</h3>
        <div className="space-y-2.5">
          {reviewData.habitCompletions.map(h => (
            <div key={h.name} className="flex items-center gap-3">
              <span className="text-base w-6 flex items-center justify-center"><HabitIcon iconId={h.icon} size={16} /></span>
              <span className="text-xs text-text-primary flex-1 min-w-0 truncate">{h.name}</span>
              <div className="w-24 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${h.rate >= 70 ? 'bg-green-soft' : h.rate >= 40 ? 'bg-accent' : 'bg-red-soft'}`} style={{ width: `${h.rate}%` }} />
              </div>
              <span className="text-xs text-text-muted w-14 text-right">{h.completed}/{h.total}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Journal & Mood */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-accent" /> Journal</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">{reviewData.weekJournals.length} entries this week</span>
            <span className="text-xs text-text-muted flex items-center gap-1">Avg mood: <MoodIcon mood={Math.round(reviewData.avgMood) || 3} size={12} /> {reviewData.avgMood}/5</span>
          </div>
          {reviewData.weekJournals.length > 0 && (
            <div className="flex gap-1">
              {reviewData.weekJournals.map(j => (
                <div key={j._id} className="flex-1 text-center p-2 bg-bg-elevated rounded-lg">
                  <div className="flex justify-center"><MoodIcon mood={j.mood || 3} size={20} /></div>
                  <p className="text-xs text-text-muted mt-0.5">{j.date.slice(5)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gym */}
        <div className="card">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><Dumbbell className="w-3.5 h-3.5 text-green-soft" /> Gym</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-bg-elevated rounded-lg">
              <p className="text-lg font-bold text-green-soft">{reviewData.weekWorkouts.length}</p>
              <p className="text-xs text-text-muted">Workouts</p>
            </div>
            <div className="p-2 bg-bg-elevated rounded-lg">
              <p className="text-lg font-bold text-accent">{Math.round(reviewData.totalVolume / 1000)}k</p>
              <p className="text-xs text-text-muted">Volume (kg)</p>
            </div>
            <div className="p-2 bg-bg-elevated rounded-lg">
              <p className="text-lg font-bold text-blue-soft">{reviewData.totalDuration}m</p>
              <p className="text-xs text-text-muted">Duration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Progress */}
      <div className="card mb-4">
        <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-accent" /> Goals · {reviewData.avgGoalProgress}% avg</h3>
        <div className="space-y-2">
          {reviewData.activeGoals.slice(0, 5).map(g => {
            const pct = Math.round((g.progress / g.target) * 100)
            return (
              <div key={g._id} className="flex items-center gap-3">
                <span className="text-xs text-text-primary flex-1 min-w-0 truncate">{g.title}</span>
                <div className="w-20 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-text-muted w-10 text-right">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sleep & Body */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><Moon className="w-3.5 h-3.5 text-purple-soft" /> Sleep</h3>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-bg-elevated rounded-lg">
              <p className="text-lg font-bold text-purple-soft">{reviewData.avgSleep}h</p>
              <p className="text-xs text-text-muted">Avg Hours</p>
            </div>
            <div className="p-2 bg-bg-elevated rounded-lg">
              <p className="text-lg font-bold text-green-soft">{reviewData.avgSleepQuality}/5</p>
              <p className="text-xs text-text-muted">Avg Quality</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-accent" /> Body</h3>
          {reviewData.latestBody ? (
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 bg-bg-elevated rounded-lg">
                <p className="text-lg font-bold text-accent">{reviewData.latestBody.weight || '—'}</p>
                <p className="text-xs text-text-muted">Weight (kg)</p>
              </div>
              <div className="p-2 bg-bg-elevated rounded-lg">
                <p className="text-lg font-bold text-blue-soft">{reviewData.latestBody.bodyFat || '—'}%</p>
                <p className="text-xs text-text-muted">Body Fat</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-text-muted text-center py-4">No body data yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
