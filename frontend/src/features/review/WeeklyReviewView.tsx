'use client'

import { useEffect, useMemo, useState } from 'react'
import { useHabitsStore, useJournalStore, useWorkoutsStore, useMealsStore, useTasksStore, useGoalsStore, useSleepTrackerStore, useBodyTrackerStore, useSettingsStore, useGoogleFitnessStore, DEFAULT_GOALS } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { MOTIVATIONAL_QUOTES } from '@/lib/quotes'
import { BarChart3, Flame, BookOpen, Dumbbell, CheckSquare, Target, Moon, Scale, TrendingUp, TrendingDown, Minus, Award, Quote, Utensils, Zap, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { MoodIcon, HabitIcon } from '@/lib/icons'

function getWeekDates(offset = 0) {
  const now = new Date()
  now.setDate(now.getDate() + offset * 7)
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(now)
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return toISODate(d)
  })
  return { start: dates[0], end: dates[6], dates }
}

function fmt(n: number, unit = '') {
  if (n === 0) return '—'
  return `${n}${unit}`
}

function fmtDec(n: number, unit = '') {
  if (n === 0) return '—'
  return `${n}${unit}`
}

function TrendBadge({ current, previous }: { current: number; previous: number; invert?: boolean }) {
  if (previous === 0 || current === 0) return null
  const diff = current - previous
  const pct = Math.round((diff / previous) * 100)
  if (pct === 0) return <span className="text-[10px] text-text-muted flex items-center gap-0.5"><Minus className="w-2.5 h-2.5" />0%</span>
  if (Math.abs(pct) > 300) return null // suppress misleading large swings
  const isPositive = pct > 0
  return (
    <span className={`text-[10px] flex items-center gap-0.5 ${isPositive ? 'text-green-soft' : 'text-red-soft'}`}>
      {pct > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {pct > 0 ? '+' : ''}{pct}%
    </span>
  )
}

function TrendBadgeInvert({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 || current === 0) return null
  const diff = current - previous
  const pct = Math.round((diff / previous) * 100)
  if (pct === 0) return <span className="text-[10px] text-text-muted flex items-center gap-0.5"><Minus className="w-2.5 h-2.5" />0%</span>
  if (Math.abs(pct) > 300) return null
  const isPositive = pct < 0 // for weight/fat: decrease is good
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
  const fitnessDays = useGoogleFitnessStore(s => s.days)
  const settingsGoals = useSettingsStore(s => s.goals) || DEFAULT_GOALS

  const [weekOffset, setWeekOffset] = useState(0)

  useEffect(() => {
    useHabitsStore.getState().fetchHabits().catch(() => {})
    useJournalStore.getState().fetchEntries().catch(() => {})
    useWorkoutsStore.getState().fetchWorkouts().catch(() => {})
    useMealsStore.getState().fetchMeals().catch(() => {})
    useTasksStore.getState().fetchTasks().catch(() => {})
    useGoalsStore.getState().fetchGoals().catch(() => {})
    useSleepTrackerStore.getState().fetchLogs().catch(() => {})
    useBodyTrackerStore.getState().fetchLogs().catch(() => {})
    useGoogleFitnessStore.getState().fetchFitnessData({ silent: true, days: 21 }).catch(() => {})
  }, [])

  const week = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const prevWeek = useMemo(() => getWeekDates(weekOffset - 1), [weekOffset])

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
    const hasHabits = habitCompletions.length > 0

    // ─── Journal & Mood ───
    const weekJournals = entries.filter(e => week.dates.includes(e.date)).sort((a, b) => a.date.localeCompare(b.date))
    const prevJournals = entries.filter(e => prevWeek.dates.includes(e.date))
    const avgMood = weekJournals.length > 0
      ? +(weekJournals.reduce((s, e) => s + e.mood, 0) / weekJournals.length).toFixed(1) : 0
    const prevAvgMood = prevJournals.length > 0
      ? +(prevJournals.reduce((s, e) => s + e.mood, 0) / prevJournals.length).toFixed(1) : 0
    const hasMood = weekJournals.length > 0

    // Mood trend over the week (linear: last minus first)
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
    const hasWorkouts = weekWorkouts.length > 0
    const workoutGoal = settingsGoals.workoutsPerWeek || 3

    // ─── Tasks — tasks due this week, plus all non-archived tasks as context ───
    const weekTasksDue = tasks.filter(t => t.dueDate && week.dates.includes(t.dueDate))
    // Undated tasks: include them if we have no dated tasks at all (gives a meaningful overview)
    const hasDateTasks = weekTasksDue.length > 0
    const undatedActive = tasks.filter(t => !t.dueDate)
    const weekTasks = hasDateTasks ? weekTasksDue : undatedActive
    const weekCompleted = weekTasks.filter(t => t.status === 'done').length
    const weekTotal = weekTasks.length
    const taskRate = weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0
    const hasTasks = weekTotal > 0

    const prevWeekTasksDue = tasks.filter(t => t.dueDate && prevWeek.dates.includes(t.dueDate))
    const prevWeekTasks = prevWeekTasksDue.length > 0 ? prevWeekTasksDue : []
    const prevWeekCompleted = prevWeekTasks.filter(t => t.status === 'done').length
    const prevTaskRate = prevWeekTasks.length > 0 ? Math.round((prevWeekCompleted / prevWeekTasks.length) * 100) : 0

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
    const hasSleep = weekSleep.length > 0
    const maxSleepH = weekSleep.length > 0 ? Math.max(...weekSleep.map(l => l.hours), settingsGoals.sleep || 8) : (settingsGoals.sleep || 8)

    // ─── Nutrition (meals this week) ───
    const fitCaloriesByDate = new Map(fitnessDays.map((d) => [d.date, d.calories] as const))
    const mealCaloriesByDate = new Map<string, number>()
    for (const m of meals) {
      if (!m.date) continue
      const date = m.date.slice(0, 10)
      mealCaloriesByDate.set(date, (mealCaloriesByDate.get(date) || 0) + (m.calories || 0))
    }
    const caloriesForDate = (date: string) => {
      const mealCalories = mealCaloriesByDate.get(date) || 0
      return mealCalories > 0 ? mealCalories : (fitCaloriesByDate.get(date) || 0)
    }
    const weekMeals = meals.filter(m => m.date && week.dates.includes(m.date.slice(0, 10)))
    const totalProtein = weekMeals.reduce((s, m) => s + (m.protein || 0), 0)
    const proteinDays = new Set(weekMeals.map(m => m.date.slice(0, 10))).size
    const avgProtein = proteinDays > 0 ? Math.round(totalProtein / proteinDays) : 0
    const weekCalorieDays = week.dates.map(caloriesForDate).filter(v => v > 0)
    const avgCalories = weekCalorieDays.length > 0
      ? Math.round(weekCalorieDays.reduce((s, v) => s + v, 0) / weekCalorieDays.length) : 0
    const prevCalorieDays = prevWeek.dates.map(caloriesForDate).filter(v => v > 0)
    const prevAvgCalories = prevCalorieDays.length > 0
      ? Math.round(prevCalorieDays.reduce((s, v) => s + v, 0) / prevCalorieDays.length) : 0
    const hasNutrition = avgCalories > 0

    // ─── Body ───
    const weekBody = bodyLogs.filter(l => week.dates.includes(l.date)).sort((a, b) => b.date.localeCompare(a.date))
    const latestBody = weekBody[0] || null
    const prevBody = bodyLogs.filter(l => prevWeek.dates.includes(l.date)).sort((a, b) => b.date.localeCompare(a.date))[0] || null

    // ─── Life Score — normalize to categories with data only ───
    // Base weights
    type ScoreCategory = { score: number; weight: number }
    const scoreCategories: ScoreCategory[] = []
    if (hasHabits) scoreCategories.push({ score: overallHabitRate, weight: 0.30 })
    if (hasTasks) scoreCategories.push({ score: taskRate, weight: 0.25 })
    if (hasSleep) scoreCategories.push({ score: (Math.min(avgSleep, settingsGoals.sleep) / settingsGoals.sleep) * 100, weight: 0.20 })
    if (hasMood) scoreCategories.push({ score: (avgMood / 5) * 100, weight: 0.15 })
    if (hasWorkouts) scoreCategories.push({ score: Math.min(weekWorkouts.length / workoutGoal, 1) * 100, weight: 0.10 })
    if (hasNutrition) scoreCategories.push({ score: Math.min(avgCalories / (settingsGoals.calories || 2000), 1) * 100, weight: 0.10 })

    let lifeScore = 0
    if (scoreCategories.length > 0) {
      const totalWeight = scoreCategories.reduce((s, c) => s + c.weight, 0)
      lifeScore = Math.min(100, Math.round(
        scoreCategories.reduce((s, c) => s + c.score * (c.weight / totalWeight), 0)
      ))
    }

    // Previous week Life Score (same logic)
    const prevScoreCategories: ScoreCategory[] = []
    if (hasHabits) prevScoreCategories.push({ score: prevHabitRate, weight: 0.30 })
    if (hasTasks) prevScoreCategories.push({ score: prevTaskRate, weight: 0.25 })
    if (prevSleep.length > 0) {
      const prevAvgSleepVal = +(prevSleep.reduce((s, l) => s + l.hours, 0) / prevSleep.length).toFixed(1)
      prevScoreCategories.push({ score: (Math.min(prevAvgSleepVal, settingsGoals.sleep) / settingsGoals.sleep) * 100, weight: 0.20 })
    }
    if (prevJournals.length > 0) prevScoreCategories.push({ score: (prevAvgMood / 5) * 100, weight: 0.15 })
    if (prevWorkouts.length > 0) prevScoreCategories.push({ score: Math.min(prevWorkouts.length / workoutGoal, 1) * 100, weight: 0.10 })
    if (prevAvgCalories > 0) prevScoreCategories.push({ score: Math.min(prevAvgCalories / (settingsGoals.calories || 2000), 1) * 100, weight: 0.10 })

    let prevLifeScore = 0
    if (prevScoreCategories.length > 0) {
      const totalWeight = prevScoreCategories.reduce((s, c) => s + c.weight, 0)
      prevLifeScore = Math.min(100, Math.round(
        prevScoreCategories.reduce((s, c) => s + c.score * (c.weight / totalWeight), 0)
      ))
    }

    return {
      habitCompletions, overallHabitRate, prevHabitRate, hasHabits,
      weekJournals, avgMood, prevAvgMood, moodTrend, hasMood,
      weekWorkouts, totalVolume, prevVolume, totalDuration, prevWorkoutCount: prevWorkouts.length, hasWorkouts, workoutGoal,
      weekCompleted, weekTotal, taskRate, prevTaskRate, hasTasks,
      activeGoals, avgGoalProgress,
      avgSleep, prevAvgSleep, avgSleepQuality, weekSleep, hasSleep, maxSleepH,
      avgCalories, prevAvgCalories, avgProtein, hasNutrition,
      latestBody, prevBody,
      lifeScore, prevLifeScore,
      scoreCategories,
    }
  }, [habits, entries, workouts, meals, tasks, goals, sleepLogs, bodyLogs, fitnessDays, week, prevWeek, settingsGoals])

  // Quote of the day (deterministic per day)
  const quote = MOTIVATIONAL_QUOTES[new Date().getDate() % MOTIVATIONAL_QUOTES.length]

  const lifeScoreColor = reviewData.lifeScore >= 70 ? 'text-green-soft' : reviewData.lifeScore >= 40 ? 'text-accent' : 'text-red-soft'
  const lifeScoreBar = reviewData.lifeScore >= 70 ? 'bg-green-soft' : reviewData.lifeScore >= 40 ? 'bg-accent' : 'bg-red-soft'

  const bestHabit = reviewData.habitCompletions.length > 0 ? [...reviewData.habitCompletions].sort((a, b) => b.rate - a.rate)[0] : null
  const worstHabit = reviewData.habitCompletions.length > 1 ? [...reviewData.habitCompletions].sort((a, b) => a.rate - b.rate)[0] : null

  const isCurrentWeek = weekOffset === 0

  return (
    <div>
      {/* Header + Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-accent" />
            {isCurrentWeek ? 'Weekly Review' : 'Past Review'}
          </h1>
          <p className="text-text-muted text-xs mt-0.5 flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {formatDate(week.start)} – {formatDate(week.end)}
            {isCurrentWeek && <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-medium">This Week</span>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset(w => w - 1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {!isCurrentWeek && (
            <button onClick={() => setWeekOffset(0)}
              className="px-2.5 py-1 text-xs rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors font-medium">
              Today
            </button>
          )}
          <button onClick={() => setWeekOffset(w => Math.min(0, w + 1))}
            disabled={isCurrentWeek}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.06] text-text-muted hover:text-text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
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
          <p className={`text-5xl font-bold ${reviewData.lifeScore > 0 ? lifeScoreColor : 'text-text-muted'}`}>
            {reviewData.lifeScore > 0 ? reviewData.lifeScore : '—'}
          </p>
          {reviewData.lifeScore > 0 && <TrendBadge current={reviewData.lifeScore} previous={reviewData.prevLifeScore} />}
        </div>
        <p className="text-xs text-text-muted mt-1">Life Score this week</p>
        {reviewData.lifeScore > 0 && (
          <div className="h-2 bg-bg-elevated rounded-full overflow-hidden mt-3 max-w-xs mx-auto">
            <div className={`h-full rounded-full transition-all duration-700 ${lifeScoreBar}`} style={{ width: `${reviewData.lifeScore}%` }} />
          </div>
        )}
        {reviewData.scoreCategories.length > 0 && (
          <p className="text-[11px] text-text-secondary mt-2">
            Based on: {[
              reviewData.hasHabits && 'Habits',
              reviewData.hasTasks && 'Tasks',
              reviewData.hasSleep && 'Sleep',
              reviewData.hasMood && 'Mood',
              reviewData.hasWorkouts && 'Gym',
              reviewData.hasNutrition && 'Nutrition',
            ].filter(Boolean).join(' · ')}
          </p>
        )}
        {reviewData.scoreCategories.length === 0 && (
          <p className="text-xs text-text-muted mt-2">Log habits, sleep, or mood to get your score</p>
        )}
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card text-center">
          <Flame className="w-4 h-4 text-accent mx-auto mb-1" />
          <div className="flex items-center justify-center gap-1.5">
            <p className={`text-2xl font-bold ${reviewData.hasHabits ? 'text-accent' : 'text-text-muted'}`}>
              {reviewData.hasHabits ? `${reviewData.overallHabitRate}%` : '—'}
            </p>
            {reviewData.hasHabits && <TrendBadge current={reviewData.overallHabitRate} previous={reviewData.prevHabitRate} />}
          </div>
          <p className="text-[11px] text-text-secondary">Habit Rate</p>
        </div>
        <div className="card text-center">
          <Dumbbell className="w-4 h-4 text-green-soft mx-auto mb-1" />
          <div className="flex items-center justify-center gap-1.5">
            <p className={`text-2xl font-bold ${reviewData.hasWorkouts ? 'text-green-soft' : 'text-text-muted'}`}>
              {reviewData.hasWorkouts ? reviewData.weekWorkouts.length : '—'}
            </p>
            {reviewData.hasWorkouts && <TrendBadge current={reviewData.weekWorkouts.length} previous={reviewData.prevWorkoutCount} />}
          </div>
          <p className="text-[11px] text-text-secondary">Workouts</p>
        </div>
        <div className="card text-center">
          <CheckSquare className="w-4 h-4 text-blue-soft mx-auto mb-1" />
          <div className="flex items-center justify-center gap-1.5">
            <p className={`text-2xl font-bold ${reviewData.hasTasks ? 'text-blue-soft' : 'text-text-muted'}`}>
              {reviewData.hasTasks ? `${reviewData.taskRate}%` : '—'}
            </p>
            {reviewData.hasTasks && <TrendBadge current={reviewData.taskRate} previous={reviewData.prevTaskRate} />}
          </div>
          <p className="text-[11px] text-text-secondary">
            {reviewData.hasTasks ? `${reviewData.weekCompleted}/${reviewData.weekTotal} Tasks` : 'No tasks'}
          </p>
        </div>
        <div className="card text-center">
          <Moon className="w-4 h-4 text-purple-soft mx-auto mb-1" />
          <div className="flex items-center justify-center gap-1.5">
            <p className={`text-2xl font-bold ${reviewData.hasSleep ? 'text-purple-soft' : 'text-text-muted'}`}>
              {reviewData.hasSleep ? `${reviewData.avgSleep}h` : '—'}
            </p>
            {reviewData.hasSleep && <TrendBadge current={reviewData.avgSleep} previous={reviewData.prevAvgSleep} />}
          </div>
          <p className="text-[11px] text-text-secondary">Avg Sleep</p>
        </div>
      </div>

      {/* Highlights */}
      {(bestHabit || reviewData.moodTrend !== 0) && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {bestHabit && bestHabit.rate > 0 && (
            <div className="card flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-green-soft/10 flex items-center justify-center shrink-0">
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
              <div className="w-8 h-8 rounded-lg bg-red-soft/10 flex items-center justify-center shrink-0">
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
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${reviewData.moodTrend > 0 ? 'bg-green-soft/10' : 'bg-red-soft/10'}`}>
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
                  <div key={i} title={week.dates[i]} className={`w-3 h-3 rounded-sm ${done ? (h.rate >= 70 ? 'bg-green-soft' : h.rate >= 40 ? 'bg-accent' : 'bg-red-soft') : 'bg-bg-elevated'}`} />
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
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-accent" /> Journal & Mood</h3>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-text-muted">{reviewData.weekJournals.length} entries this week</span>
            {reviewData.hasMood && (
              <span className="text-xs text-text-muted flex items-center gap-1">
                Avg: <MoodIcon mood={Math.round(reviewData.avgMood) || 3} size={12} /> {reviewData.avgMood}/5
                <TrendBadge current={reviewData.avgMood * 20} previous={reviewData.prevAvgMood * 20} />
              </span>
            )}
          </div>
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
          {!reviewData.hasMood && (
            <p className="text-xs text-text-muted text-center mt-3 py-2">No journal entries this week</p>
          )}
        </div>

        {/* Nutrition */}
        <div className="card">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><Utensils className="w-3.5 h-3.5 text-orange-soft" /> Nutrition (daily avg)</h3>
          {reviewData.hasNutrition ? (
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 bg-bg-elevated rounded-lg">
                <p className="text-lg font-bold text-accent">{reviewData.avgCalories}</p>
                <p className="text-xs text-text-muted">Calories</p>
                {settingsGoals.calories > 0 && (
                  <div className="h-1 bg-border rounded-full mt-1 overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (reviewData.avgCalories / settingsGoals.calories) * 100)}%` }} />
                  </div>
                )}
                <p className="text-[10px] text-text-muted mt-1">goal: {settingsGoals.calories}</p>
              </div>
              <div className="p-2 bg-bg-elevated rounded-lg">
                <p className="text-lg font-bold text-green-soft">{reviewData.avgProtein > 0 ? `${reviewData.avgProtein}g` : '—'}</p>
                <p className="text-xs text-text-muted">Protein</p>
                {settingsGoals.protein > 0 && reviewData.avgProtein > 0 && (
                  <div className="h-1 bg-border rounded-full mt-1 overflow-hidden">
                    <div className="h-full rounded-full bg-green-soft" style={{ width: `${Math.min(100, (reviewData.avgProtein / settingsGoals.protein) * 100)}%` }} />
                  </div>
                )}
                <p className="text-[10px] text-text-muted mt-1">goal: {settingsGoals.protein}g</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-1">
              <Utensils className="w-6 h-6 text-text-muted/40" />
              <p className="text-xs text-text-muted">No meals logged this week</p>
            </div>
          )}
        </div>
      </div>

      {/* Gym */}
      <div className="card mb-4">
        <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><Dumbbell className="w-3.5 h-3.5 text-green-soft" /> Gym
          <span className="ml-auto text-[10px] text-text-muted">{reviewData.weekWorkouts.length}/{reviewData.workoutGoal} goal</span>
        </h3>
        {reviewData.hasWorkouts ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-bg-elevated rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-lg font-bold text-green-soft">{reviewData.weekWorkouts.length}</p>
                  <TrendBadge current={reviewData.weekWorkouts.length} previous={reviewData.prevWorkoutCount} />
                </div>
                <p className="text-xs text-text-muted">Sessions</p>
              </div>
              <div className="p-2 bg-bg-elevated rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-lg font-bold text-accent">
                    {reviewData.totalVolume > 0 ? (reviewData.totalVolume > 1000 ? `${(reviewData.totalVolume / 1000).toFixed(1)}k` : reviewData.totalVolume) : '—'}
                  </p>
                  {reviewData.totalVolume > 0 && <TrendBadge current={reviewData.totalVolume} previous={reviewData.prevVolume} />}
                </div>
                <p className="text-xs text-text-muted">Volume (kg)</p>
              </div>
              <div className="p-2 bg-bg-elevated rounded-lg">
                <p className="text-lg font-bold text-blue-soft">{reviewData.totalDuration > 0 ? `${reviewData.totalDuration}m` : '—'}</p>
                <p className="text-xs text-text-muted">Duration</p>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {reviewData.weekWorkouts.map(w => (
                <div key={w._id} className="flex items-center justify-between px-2 py-1.5 bg-bg-surface rounded-lg">
                  <span className="text-xs text-text-primary">{w.name}</span>
                  <span className="text-[10px] text-text-muted">{formatDate(w.date)} · {w.duration}min · {w.exercises.length} ex</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 gap-1">
            <Dumbbell className="w-6 h-6 text-text-muted/40" />
            <p className="text-xs text-text-muted">No workouts logged this week</p>
          </div>
        )}
      </div>

      {/* Goals Progress */}
      <div className="card mb-4">
        <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-accent" />
          Goals
          {reviewData.activeGoals.length > 0 && <span className="ml-auto text-[10px] text-text-muted">{reviewData.avgGoalProgress}% avg</span>}
        </h3>
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
          {reviewData.hasSleep ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-center mb-4">
                <div className="p-2 bg-bg-elevated rounded-lg">
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-lg font-bold text-purple-soft">{reviewData.avgSleep}h</p>
                    <TrendBadge current={reviewData.avgSleep} previous={reviewData.prevAvgSleep} />
                  </div>
                  <p className="text-xs text-text-muted">Avg Hours</p>
                </div>
                <div className="p-2 bg-bg-elevated rounded-lg">
                  <p className="text-lg font-bold text-green-soft">{reviewData.avgSleepQuality > 0 ? `${reviewData.avgSleepQuality}/5` : '—'}</p>
                  <p className="text-xs text-text-muted">Avg Quality</p>
                </div>
              </div>
              {/* Sleep bar chart — fixed height approach */}
              <div className="flex items-end gap-1" style={{ height: '48px' }}>
                {week.dates.map(d => {
                  const log = reviewData.weekSleep.find(l => l.date === d)
                  const h = log?.hours ?? 0
                  const pct = h > 0 ? Math.min(100, (h / reviewData.maxSleepH) * 100) : 0
                  const dayLabel = new Date(d + 'T00:00:00').toLocaleDateString('en', { weekday: 'narrow' })
                  return (
                    <div key={d} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end" title={h > 0 ? `${h}h` : 'No data'}>
                      <div className="w-full rounded-t-sm overflow-hidden bg-bg-elevated" style={{ height: `${Math.max(pct, h > 0 ? 8 : 0)}%` }}>
                        {h > 0 && <div className="w-full h-full bg-purple-soft/70 rounded-t-sm" />}
                      </div>
                      <p className="text-[8px] text-text-muted leading-none">{dayLabel}</p>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-1">
              <Moon className="w-6 h-6 text-text-muted/40" />
              <p className="text-xs text-text-muted">No sleep logged this week</p>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5"><Scale className="w-3.5 h-3.5 text-accent" /> Body</h3>
          {reviewData.latestBody ? (
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-2 bg-bg-elevated rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-lg font-bold text-accent">{reviewData.latestBody.weight ?? '—'}</p>
                  {reviewData.prevBody?.weight && reviewData.latestBody.weight && (
                    <TrendBadgeInvert current={reviewData.latestBody.weight} previous={reviewData.prevBody.weight} />
                  )}
                </div>
                <p className="text-xs text-text-muted">Weight (kg)</p>
              </div>
              <div className="p-2 bg-bg-elevated rounded-lg">
                <div className="flex items-center justify-center gap-1">
                  <p className="text-lg font-bold text-blue-soft">{reviewData.latestBody.bodyFat != null ? `${reviewData.latestBody.bodyFat}%` : '—'}</p>
                  {reviewData.prevBody?.bodyFat && reviewData.latestBody.bodyFat && (
                    <TrendBadgeInvert current={reviewData.latestBody.bodyFat} previous={reviewData.prevBody.bodyFat} />
                  )}
                </div>
                <p className="text-xs text-text-muted">Body Fat</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-1">
              <Scale className="w-6 h-6 text-text-muted/40" />
              <p className="text-xs text-text-muted">No body data this week</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
