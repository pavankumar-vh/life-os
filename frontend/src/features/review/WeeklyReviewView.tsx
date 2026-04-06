'use client'

import { useEffect, useMemo } from 'react'
import { useHabitsStore, useJournalStore, useWorkoutsStore, useMealsStore, useTasksStore, useGoalsStore, useSleepTrackerStore, useBodyTrackerStore, useSettingsStore, DEFAULT_GOALS } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { MOTIVATIONAL_QUOTES } from '@/lib/quotes'
import { BarChart3, Flame, BookOpen, Dumbbell, CheckSquare, Target, Moon, Scale, TrendingUp, TrendingDown, Minus, Award, Quote, Utensils, Droplets, Zap } from 'lucide-react'
import { MoodIcon, HabitIcon, MOOD_LABELS } from '@/lib/icons'

function getWeekDates(offset = 0) {
  const now = new Date()
  now.setDate(now.getDate() + offset * 7)
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(now)
  start.setDate(diff)
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return toISODate(d)
  })
  return { start: dates[0], end: dates[6], dates }
}

function TrendBadge({ current, previous, unit = '', invert = false }: { current: number; previous: number; unit?: string; invert?: boolean }) {
  if (previous === 0) return null
  const diff = current - previous
  const pct = Math.round((diff / previous) * 100)
  if (pct === 0) return <span className="text-[10px] text-text-muted flex items-center gap-0.5"><Minus className="w-2.5 h-2.5" />0%</span>
  const isPositive = invert ? pct < 0 : pct > 0
  return (
    <span className={`text-[10px] flex items-center gap-0.5 ${isPositive ? 'text-green-soft' : 'text-red-soft'}`}>
      {pct > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {pct > 0 ? '+' : ''}{pct}%
    </span>
  )
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
  const settingsGoals = useSettingsStore(s => s.goals) || DEFAULT_GOALS

  useEffect(() => {
    useHabitsStore.getState().fetchHabits().catch(() => {})
    useJournalStore.getState().fetchEntries().catch(() => {})
    useWorkoutsStore.getState().fetchWorkouts().catch(() => {})
    useMealsStore.getState().fetchMeals().catch(() => {})
    useTasksStore.getState().fetchTasks().catch(() => {})
    useGoalsStore.getState().fetchGoals().catch(() => {})
    useSleepTrackerStore.getState().fetchLogs().catch(() => {})
    useBodyTrackerStore.getState().fetchLogs().catch(() => {})
  }, [])

  const week = useMemo(() => getWeekDates(0), [])
  const prevWeek = useMemo(() => getWeekDates(-1), [])

  const reviewData = useMemo(() => {
    // ─── Habits ───
    const habitCompletions = habits.map(h => {
      const weekCompleted = week.dates.filter(d => (h.completedDates || []).includes(d)).length
      const prevCompleted = prevWeek.dates.filter(d => (h.completedDates || []).includes(d)).length
      const dayByDay = week.dates.map(d => (h.completedDates || []).includes(d))
      return { name: h.name, icon: h.icon, completed: weekCompleted, prevCompleted, total: 7, rate: Math.round((weekCompleted / 7) * 100), dayByDay }
    })
    const overallHabitRate = habitCompletions.length > 0
      ? Math.round(habitCompletions.reduce((s, h) => s + h.rate, 0) / habitCompletions.length) : 0
    const prevHabitRate = habitCompletions.length > 0
      ? Math.round(habitCompletions.reduce((s, h) => s + Math.round((h.prevCompleted / 7) * 100), 0) / habitCompletions.length) : 0

    // ─── Journal & Mood ───
    const weekJournals = entries.filter(e => week.dates.includes(e.date)).sort((a, b) => a.date.localeCompare(b.date))
    const prevJournals = entries.filter(e => prevWeek.dates.includes(e.date))
    const avgMood = weekJournals.length > 0
      ? +(weekJournals.reduce((s, e) => s + e.mood, 0) / weekJournals.length).toFixed(1) : 0
    const prevAvgMood = prevJournals.length > 0
      ? +(prevJournals.reduce((s, e) => s + e.mood, 0) / prevJournals.length).toFixed(1) : 0
    // Mood trend: compare last entry to first entry of the week
    const moodTrend = weekJournals.length >= 2
      ? weekJournals[weekJournals.length - 1].mood - weekJournals[0].mood : 0

    // ─── Workouts ───
    const weekWorkouts = workouts.filter(w => week.dates.includes(w.date))
    const prevWorkouts = workouts.filter(w => prevWeek.dates.includes(w.date))
    const totalVolume = weekWorkouts.reduce((s, w) =>
      s + w.exercises.reduce((es, ex) =>
        es + ex.sets.reduce((ss, set) => ss + set.reps * set.weight, 0), 0), 0)
    const prevVolume = prevWorkouts.reduce((s, w) =>
      s + w.exercises.reduce((es, ex) =>
        es + ex.sets.reduce((ss, set) => ss + set.reps * set.weight, 0), 0), 0)
    const totalDuration = weekWorkouts.reduce((s, w) => s + w.duration, 0)

    // ─── Tasks (due this week OR no due date) ───
    const weekTasks = tasks.filter(t => {
      if (t.dueDate && week.dates.includes(t.dueDate)) return true
      return false
    })
    // Also count tasks with no dueDate as a separate pool
    const undatedDone = tasks.filter(t => !t.dueDate && t.status === 'done').length
    const undatedTotal = tasks.filter(t => !t.dueDate).length
    const datedCompleted = weekTasks.filter(t => t.status === 'done').length
    const weekCompleted = datedCompleted
    const weekTotal = weekTasks.length
    const taskRate = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : (undatedTotal > 0 ? Math.round((undatedDone / undatedTotal) * 100) : 0)

    const prevWeekTasks = tasks.filter(t => t.dueDate && prevWeek.dates.includes(t.dueDate))
    const prevWeekCompleted = prevWeekTasks.filter(t => t.status === 'done').length
    const prevTaskRate = prevWeekTasks.length > 0 ? Math.round((prevWeekCompleted / prevWeekTasks.length) * 100) : 0
    // For display: total tasks in play (dated this week + undated active)
    const totalTasksInPlay = weekTotal > 0 ? weekTotal : undatedTotal
    const totalTasksDone = weekTotal > 0 ? weekCompleted : undatedDone

    // ─── Goals ───
    const activeGoals = goals.filter(g => g.status === 'active')
    const avgGoalProgress = activeGoals.length > 0
      ? Math.round(activeGoals.reduce((s, g) => {
          const target = g.target || 1
          return s + Math.min((g.progress / target) * 100, 100)
        }, 0) / activeGoals.length) : 0

    // ─── Sleep ───
    const weekSleep = sleepLogs.filter(l => week.dates.includes(l.date))
    const prevSleep = sleepLogs.filter(l => prevWeek.dates.includes(l.date))
    const avgSleep = weekSleep.length > 0
      ? +(weekSleep.reduce((s, l) => s + l.hours, 0) / weekSleep.length).toFixed(1) : 0
    const prevAvgSleep = prevSleep.length > 0
      ? +(prevSleep.reduce((s, l) => s + l.hours, 0) / prevSleep.length).toFixed(1) : 0
    const avgSleepQuality = weekSleep.length > 0
      ? +(weekSleep.reduce((s, l) => s + l.quality, 0) / weekSleep.length).toFixed(1) : 0

    // ─── Nutrition (meals this week) ───
    const weekMeals = meals.filter(m => m.date && week.dates.includes(m.date.slice(0, 10)))
    const totalCalories = weekMeals.reduce((s, m) => s + (m.calories || 0), 0)
    const totalProtein = weekMeals.reduce((s, m) => s + (m.protein || 0), 0)
    const mealDays = new Set(weekMeals.map(m => m.date.slice(0, 10))).size
    const avgCalories = mealDays > 0 ? Math.round(totalCalories / mealDays) : 0
    const avgProtein = mealDays > 0 ? Math.round(totalProtein / mealDays) : 0

    const prevMeals = meals.filter(m => m.date && prevWeek.dates.includes(m.date.slice(0, 10)))
    const prevMealDays = new Set(prevMeals.map(m => m.date.slice(0, 10))).size
    const prevAvgCalories = prevMealDays > 0 ? Math.round(prevMeals.reduce((s, m) => s + (m.calories || 0), 0) / prevMealDays) : 0
    const prevNutritionScore = prevAvgCalories > 0 ? Math.min(prevAvgCalories / settingsGoals.calories, 1) * 100 * 0.10 : 0

    // ─── Body ───
    const weekBody = bodyLogs.filter(l => week.dates.includes(l.date)).sort((a, b) => b.date.localeCompare(a.date))
    const latestBody = weekBody[0] || (bodyLogs.length > 0 ? bodyLogs[0] : null)
    const prevBody = bodyLogs.filter(l => prevWeek.dates.includes(l.date)).sort((a, b) => b.date.localeCompare(a.date))[0] || null

    // ─── Life Score (weighted 0-100) ───
    const habitScore = overallHabitRate * 0.25
    const taskScore = taskRate * 0.20
    const moodScore = avgMood > 0 ? (avgMood / 5) * 100 * 0.15 : 0
    const sleepScore = avgSleep > 0 ? (Math.min(avgSleep, settingsGoals.sleep) / settingsGoals.sleep) * 100 * 0.20 : 0
    const workoutScore = Math.min(weekWorkouts.length / settingsGoals.workoutsPerWeek, 1) * 100 * 0.10
    const nutritionScore = avgCalories > 0 ? Math.min(avgCalories / settingsGoals.calories, 1) * 100 * 0.10 : 0
    const lifeScore = Math.min(100, Math.round(habitScore + taskScore + moodScore + sleepScore + workoutScore + nutritionScore))

    // Previous week life score for comparison
    const prevLifeScore = Math.min(100, Math.round(
      prevHabitRate * 0.25 +
      prevTaskRate * 0.20 +
      (prevAvgMood > 0 ? (prevAvgMood / 5) * 100 * 0.15 : 0) +
      (prevAvgSleep > 0 ? (Math.min(prevAvgSleep, settingsGoals.sleep) / settingsGoals.sleep) * 100 * 0.20 : 0) +
      Math.min(prevWorkouts.length / settingsGoals.workoutsPerWeek, 1) * 100 * 0.10 +
      prevNutritionScore
    ))

    return {
      habitCompletions, overallHabitRate, prevHabitRate,
      weekJournals, avgMood, prevAvgMood, moodTrend,
      weekWorkouts, totalVolume, prevVolume, totalDuration, prevWorkoutCount: prevWorkouts.length,
      weekCompleted, weekTotal, taskRate, prevTaskRate, totalTasksInPlay, totalTasksDone,
      activeGoals, avgGoalProgress,
      avgSleep, prevAvgSleep, avgSleepQuality, weekSleep,
      avgCalories, avgProtein,
      latestBody, prevBody,
      lifeScore, prevLifeScore,
    }
  }, [habits, entries, workouts, meals, tasks, goals, sleepLogs, bodyLogs, week, prevWeek, settingsGoals])

  // Quote of the day (deterministic per day)
  const quote = MOTIVATIONAL_QUOTES[new Date().getDate() % MOTIVATIONAL_QUOTES.length]

  const lifeScoreColor = reviewData.lifeScore >= 70 ? 'text-green-soft' : reviewData.lifeScore >= 40 ? 'text-accent' : 'text-red-soft'

  // Best/worst habit
  const bestHabit = reviewData.habitCompletions.length > 0 ? [...reviewData.habitCompletions].sort((a, b) => b.rate - a.rate)[0] : null
  const worstHabit = reviewData.habitCompletions.length > 1 ? [...reviewData.habitCompletions].sort((a, b) => a.rate - b.rate)[0] : null

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
        <div className="flex items-center justify-center gap-3">
          <p className={`text-5xl font-bold ${lifeScoreColor}`}>{reviewData.lifeScore}</p>
          <TrendBadge current={reviewData.lifeScore} previous={reviewData.prevLifeScore} />
        </div>
        <p className="text-xs text-text-muted mt-1">Life Score this week</p>
        <div className="h-2 bg-bg-elevated rounded-full overflow-hidden mt-3 max-w-xs mx-auto">
          <div className={`h-full rounded-full transition-all duration-700 ${
            reviewData.lifeScore >= 70 ? 'bg-green-soft' : reviewData.lifeScore >= 40 ? 'bg-accent' : 'bg-red-soft'
          }`} style={{ width: `${reviewData.lifeScore}%` }} />
        </div>
        <p className="text-[11px] text-text-secondary mt-2">Habits 25% · Tasks 20% · Sleep 20% · Mood 15% · Gym 10% · Nutrition 10%</p>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card text-center">
          <Flame className="w-4 h-4 text-accent mx-auto mb-1" />
          <div className="flex items-center justify-center gap-1.5">
            <p className="text-2xl font-bold text-accent">{reviewData.overallHabitRate}%</p>
            <TrendBadge current={reviewData.overallHabitRate} previous={reviewData.prevHabitRate} />
          </div>
          <p className="text-[11px] text-text-secondary">Habit Rate</p>
        </div>
        <div className="card text-center">
          <Dumbbell className="w-4 h-4 text-green-soft mx-auto mb-1" />
          <div className="flex items-center justify-center gap-1.5">
            <p className="text-2xl font-bold text-green-soft">{reviewData.weekWorkouts.length}</p>
            <TrendBadge current={reviewData.weekWorkouts.length} previous={reviewData.prevWorkoutCount} />
          </div>
          <p className="text-[11px] text-text-secondary">Workouts</p>
        </div>
        <div className="card text-center">
          <CheckSquare className="w-4 h-4 text-blue-soft mx-auto mb-1" />
          <div className="flex items-center justify-center gap-1.5">
            <p className="text-2xl font-bold text-blue-soft">{reviewData.taskRate}%</p>
            <TrendBadge current={reviewData.taskRate} previous={reviewData.prevTaskRate} />
          </div>
          <p className="text-[11px] text-text-secondary">{reviewData.totalTasksDone}/{reviewData.totalTasksInPlay} Tasks</p>
        </div>
        <div className="card text-center">
          <Moon className="w-4 h-4 text-purple-soft mx-auto mb-1" />
          <div className="flex items-center justify-center gap-1.5">
            <p className="text-2xl font-bold text-purple-soft">{reviewData.avgSleep}h</p>
            <TrendBadge current={reviewData.avgSleep} previous={reviewData.prevAvgSleep} />
          </div>
          <p className="text-[11px] text-text-secondary">Avg Sleep</p>
        </div>
      </div>

      {/* Highlights */}
      {(bestHabit || reviewData.moodTrend !== 0) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {bestHabit && bestHabit.rate > 0 && (
            <div className="card flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-green-soft/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-green-soft" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Best Habit</p>
                <p className="text-xs font-medium text-text-primary truncate">{bestHabit.name} ({bestHabit.rate}%)</p>
              </div>
            </div>
          )}
          {worstHabit && worstHabit.rate < 100 && (
            <div className="card flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-soft/10 flex items-center justify-center">
                <Target className="w-4 h-4 text-red-soft" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Needs Work</p>
                <p className="text-xs font-medium text-text-primary truncate">{worstHabit.name} ({worstHabit.rate}%)</p>
              </div>
            </div>
          )}
          {reviewData.moodTrend !== 0 && (
            <div className="card flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${reviewData.moodTrend > 0 ? 'bg-green-soft/10' : 'bg-red-soft/10'}`}>
                {reviewData.moodTrend > 0 ? <TrendingUp className="w-4 h-4 text-green-soft" /> : <TrendingDown className="w-4 h-4 text-red-soft" />}
              </div>
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Mood Trend</p>
                <p className={`text-xs font-medium ${reviewData.moodTrend > 0 ? 'text-green-soft' : 'text-red-soft'}`}>
                  {reviewData.moodTrend > 0 ? 'Improving' : 'Declining'} ({reviewData.moodTrend > 0 ? '+' : ''}{reviewData.moodTrend})
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Habits Breakdown */}
      <div className="card mb-4">
        <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-accent" /> Habits</h3>
        <div className="space-y-2.5">
          {reviewData.habitCompletions.map(h => (
            <div key={h.name} className="flex items-center gap-3">
              <span className="text-base w-6 flex items-center justify-center"><HabitIcon iconId={h.icon} size={16} /></span>
              <span className="text-xs text-text-primary flex-1 min-w-0 truncate">{h.name}</span>
              <div className="flex gap-0.5">
                {h.dayByDay.map((done, i) => (
                  <div key={i} className={`w-3 h-3 rounded-sm ${done ? (h.rate >= 70 ? 'bg-green-soft' : h.rate >= 40 ? 'bg-accent' : 'bg-red-soft') : 'bg-bg-elevated'}`} />
                ))}
              </div>
              <span className="text-xs text-text-muted w-14 text-right">{h.completed}/{h.total}</span>
              <TrendBadge current={h.completed} previous={h.prevCompleted} />
            </div>
          ))}
          {reviewData.habitCompletions.length === 0 && (
            <p className="text-xs text-text-muted text-center py-3">No habits tracked yet</p>
          )}
        </div>
      </div>

      {/* Journal & Mood + Nutrition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-accent" /> Journal</h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-text-muted">{reviewData.weekJournals.length} entries this week</span>
            <span className="text-xs text-text-muted flex items-center gap-1">
              Avg mood: <MoodIcon mood={Math.round(reviewData.avgMood) || 3} size={12} /> {reviewData.avgMood}/5
              <TrendBadge current={reviewData.avgMood * 20} previous={reviewData.prevAvgMood * 20} />
            </span>
          </div>
          {reviewData.weekJournals.length > 0 && (
            <div className="flex gap-1">
              {week.dates.map(d => {
                const j = reviewData.weekJournals.find(e => e.date === d)
                const dayLabel = new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'narrow' })
                return (
                  <div key={d} className={`flex-1 text-center p-1.5 rounded-lg ${j ? 'bg-bg-elevated' : 'bg-bg-surface/50'}`}>
                    {j ? <div className="flex justify-center"><MoodIcon mood={j.mood || 3} size={18} /></div> : <div className="w-[18px] h-[18px] mx-auto rounded-full bg-border/30" />}
                    <p className="text-[9px] text-text-muted mt-0.5">{dayLabel}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Nutrition */}
        <div className="card">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><Utensils className="w-3.5 h-3.5 text-orange-soft" /> Nutrition (daily avg)</h3>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2 bg-bg-elevated rounded-lg">
              <p className="text-lg font-bold text-accent">{reviewData.avgCalories}</p>
              <p className="text-xs text-text-muted">Calories</p>
              {settingsGoals.calories > 0 && (
                <div className="h-1 bg-border rounded-full mt-1 overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (reviewData.avgCalories / settingsGoals.calories) * 100)}%` }} />
                </div>
              )}
            </div>
            <div className="p-2 bg-bg-elevated rounded-lg">
              <p className="text-lg font-bold text-green-soft">{reviewData.avgProtein}g</p>
              <p className="text-xs text-text-muted">Protein</p>
              {settingsGoals.protein > 0 && (
                <div className="h-1 bg-border rounded-full mt-1 overflow-hidden">
                  <div className="h-full rounded-full bg-green-soft" style={{ width: `${Math.min(100, (reviewData.avgProtein / settingsGoals.protein) * 100)}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gym */}
      <div className="card mb-4">
        <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><Dumbbell className="w-3.5 h-3.5 text-green-soft" /> Gym</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-bg-elevated rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <p className="text-lg font-bold text-green-soft">{reviewData.weekWorkouts.length}</p>
              <TrendBadge current={reviewData.weekWorkouts.length} previous={reviewData.prevWorkoutCount} />
            </div>
            <p className="text-xs text-text-muted">Workouts</p>
          </div>
          <div className="p-2 bg-bg-elevated rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <p className="text-lg font-bold text-accent">{reviewData.totalVolume > 1000 ? `${(reviewData.totalVolume / 1000).toFixed(1)}k` : reviewData.totalVolume}</p>
              <TrendBadge current={reviewData.totalVolume} previous={reviewData.prevVolume} />
            </div>
            <p className="text-xs text-text-muted">Volume (kg)</p>
          </div>
          <div className="p-2 bg-bg-elevated rounded-lg">
            <p className="text-lg font-bold text-blue-soft">{reviewData.totalDuration}m</p>
            <p className="text-xs text-text-muted">Duration</p>
          </div>
        </div>
        {reviewData.weekWorkouts.length > 0 && (
          <div className="mt-3 space-y-1">
            {reviewData.weekWorkouts.map(w => (
              <div key={w._id} className="flex items-center justify-between px-2 py-1.5 bg-bg-surface rounded-lg">
                <span className="text-xs text-text-primary">{w.name}</span>
                <span className="text-[10px] text-text-muted">{formatDate(w.date)} · {w.duration}min · {w.exercises.length} exercises</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Goals Progress */}
      <div className="card mb-4">
        <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-accent" /> Goals · {reviewData.avgGoalProgress}% avg</h3>
        <div className="space-y-2">
          {reviewData.activeGoals.slice(0, 5).map(g => {
            const target = g.target || 1
            const pct = Math.min(100, Math.round((g.progress / target) * 100))
            return (
              <div key={g._id} className="flex items-center gap-3">
                <span className="text-xs text-text-primary flex-1 min-w-0 truncate">{g.title}</span>
                <div className="w-20 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${pct >= 80 ? 'bg-green-soft' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-text-muted w-16 text-right">{g.progress}/{target} {g.unit}</span>
              </div>
            )
          })}
          {reviewData.activeGoals.length === 0 && (
            <p className="text-xs text-text-muted text-center py-3">No active goals</p>
          )}
        </div>
      </div>

      {/* Sleep & Body */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><Moon className="w-3.5 h-3.5 text-purple-soft" /> Sleep</h3>
          <div className="grid grid-cols-2 gap-2 text-center mb-3">
            <div className="p-2 bg-bg-elevated rounded-lg">
              <div className="flex items-center justify-center gap-1">
                <p className="text-lg font-bold text-purple-soft">{reviewData.avgSleep}h</p>
                <TrendBadge current={reviewData.avgSleep} previous={reviewData.prevAvgSleep} />
              </div>
              <p className="text-xs text-text-muted">Avg Hours</p>
            </div>
            <div className="p-2 bg-bg-elevated rounded-lg">
              <p className="text-lg font-bold text-green-soft">{reviewData.avgSleepQuality}/5</p>
              <p className="text-xs text-text-muted">Avg Quality</p>
            </div>
          </div>
          {reviewData.weekSleep.length > 0 && (
            <div className="flex items-end gap-1 h-12">
              {week.dates.map(d => {
                const log = reviewData.weekSleep.find(l => l.date === d)
                const h = log ? log.hours : 0
                const maxH = settingsGoals.sleep || 8
                const pct = Math.min(100, (h / maxH) * 100)
                return (
                  <div key={d} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full rounded-t-sm bg-purple-soft/20 relative" style={{ height: `${pct}%`, minHeight: h > 0 ? '4px' : '0' }}>
                      <div className="absolute inset-0 rounded-t-sm bg-purple-soft" style={{ opacity: h > 0 ? 0.7 : 0 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-accent" /> Body</h3>
          {reviewData.latestBody ? (
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 bg-bg-elevated rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-lg font-bold text-accent">{reviewData.latestBody.weight || '—'}</p>
                  {reviewData.prevBody?.weight && reviewData.latestBody.weight && (
                    <TrendBadge current={reviewData.latestBody.weight} previous={reviewData.prevBody.weight} invert />
                  )}
                </div>
                <p className="text-xs text-text-muted">Weight (kg)</p>
              </div>
              <div className="p-2 bg-bg-elevated rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-lg font-bold text-blue-soft">{reviewData.latestBody.bodyFat || '—'}%</p>
                  {reviewData.prevBody?.bodyFat && reviewData.latestBody.bodyFat && (
                    <TrendBadge current={reviewData.latestBody.bodyFat} previous={reviewData.prevBody.bodyFat} invert />
                  )}
                </div>
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
