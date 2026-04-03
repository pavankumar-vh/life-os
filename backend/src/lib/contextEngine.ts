/**
 * Smart CAG (Context-Augmented Generation) Engine
 * Pre-computes analytics, trends, and correlations from user data
 * and returns a structured context string for the LLM.
 * Includes in-memory caching (5 min TTL) to avoid re-querying every message.
 */

import { Journal } from '../models/Journal'
import { Habit } from '../models/Habit'
import { Task } from '../models/Task'
import { Goal } from '../models/Goal'
import { Expense } from '../models/Expense'
import { Workout } from '../models/Workout'
import { Meal } from '../models/Meal'
import { BodyLog } from '../models/BodyLog'
import { SleepLog } from '../models/SleepLog'
import { WaterLog } from '../models/WaterLog'
import { Gratitude } from '../models/Gratitude'
import { Book } from '../models/Book'

// ─── Cache ──────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const cache = new Map<string, { context: string; ts: number }>()

export function invalidateContextCache(userId: string) {
  cache.delete(userId)
}

export async function buildSmartContext(userId: string): Promise<string> {
  const cached = cache.get(userId)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.context

  const context = await computeContext(userId)
  cache.set(userId, { context, ts: Date.now() })
  return context
}

// ─── Helpers ────────────────────────────────────────
function isoDate(daysAgo = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}
function avg(nums: number[]): number {
  return nums.length ? +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : 0
}
function delta(curr: number, prev: number): string {
  const d = curr - prev
  if (d === 0) return '→ no change'
  return d > 0 ? `↑ +${d.toFixed(1)}` : `↓ ${d.toFixed(1)}`
}
function pct(part: number, whole: number): string {
  if (!whole) return '0%'
  return Math.round((part / whole) * 100) + '%'
}

// ─── Main compute ───────────────────────────────────
async function computeContext(userId: string): Promise<string> {
  const today = isoDate()
  const sevenAgo = isoDate(7)
  const thirtyAgo = isoDate(30)
  const ninetyAgo = isoDate(90)

  // Parallel fetch — wider window, more data
  const [
    journals90, habits, allTasks, goals, expenses90,
    workouts90, meals30, bodyLogs90, sleepLogs30,
    waterLogs30, gratitude30, books,
  ] = await Promise.all([
    Journal.find({ userId, date: { $gte: ninetyAgo } }).sort({ date: -1 }).lean(),
    Habit.find({ userId }).lean(),
    Task.find({ userId }).lean(),
    Goal.find({ userId }).lean(),
    Expense.find({ userId, date: { $gte: ninetyAgo } }).lean(),
    Workout.find({ userId, date: { $gte: ninetyAgo } }).sort({ date: -1 }).lean(),
    Meal.find({ userId, date: { $gte: thirtyAgo } }).sort({ date: -1 }).lean(),
    BodyLog.find({ userId, date: { $gte: ninetyAgo } }).sort({ date: -1 }).lean(),
    SleepLog.find({ userId, date: { $gte: thirtyAgo } }).sort({ date: -1 }).lean(),
    WaterLog.find({ userId, date: { $gte: thirtyAgo } }).sort({ date: -1 }).lean(),
    Gratitude.find({ userId, date: { $gte: thirtyAgo } }).sort({ date: -1 }).lean(),
    Book.find({ userId }).lean(),
  ])

  const sections: string[] = []
  sections.push(`📅 TODAY: ${today}`)

  // ═══ JOURNAL / MOOD ANALYTICS ═══
  if (journals90.length) {
    const j7 = journals90.filter((j: any) => j.date >= sevenAgo)
    const j30 = journals90.filter((j: any) => j.date >= thirtyAgo)
    const moods7 = j7.map((j: any) => j.mood).filter(Boolean) as number[]
    const energy7 = j7.map((j: any) => j.energy).filter(Boolean) as number[]
    const moods30 = j30.map((j: any) => j.mood).filter(Boolean) as number[]
    const energy30 = j30.map((j: any) => j.energy).filter(Boolean) as number[]

    let s = `JOURNAL & MOOD (${journals90.length} entries in 90d):`
    if (moods7.length) s += `\n  7-day avg mood: ${avg(moods7)}/5, energy: ${avg(energy7)}/5`
    if (moods30.length) s += `\n  30-day avg mood: ${avg(moods30)}/5, energy: ${avg(energy30)}/5`
    if (moods7.length && moods30.length) {
      s += `\n  Mood trend: ${delta(avg(moods7), avg(moods30))} vs 30d avg`
    }
    // Best/worst mood days
    const best = j7.reduce((a: any, b: any) => ((b.mood || 0) > (a.mood || 0) ? b : a), j7[0])
    const worst = j7.reduce((a: any, b: any) => ((b.mood || 0) < (a.mood || 0) ? b : a), j7[0])
    if (best && worst && j7.length >= 3) {
      s += `\n  Best mood day (7d): ${best.date} (${best.mood}/5), worst: ${worst.date} (${worst.mood}/5)`
    }
    // Recent entries with content
    const recentJ = journals90.slice(0, 5)
    s += `\n  Recent entries:`
    recentJ.forEach((j: any) => {
      s += `\n    ${j.date}: mood=${j.mood}/5, energy=${j.energy}/5`
      if (j.title) s += `, "${j.title}"`
      if (j.content) s += ` — ${(j.content as string).slice(0, 150)}`
    })
    sections.push(s)
  }

  // ═══ HABITS ANALYTICS ═══
  if (habits.length) {
    const last7 = Array.from({ length: 7 }, (_, i) => isoDate(i))
    let totalCompletions7 = 0, totalPossible7 = 0
    const habitStats = habits.map((h: any) => {
      const completed7 = last7.filter(d => h.completedDates?.includes(d)).length
      totalCompletions7 += completed7
      totalPossible7 += h.frequency === 'daily' ? 7 : 1
      const completionRate = h.frequency === 'daily' ? pct(completed7, 7) : (completed7 > 0 ? '✓' : '✗')
      return `  - ${h.name}: streak=${h.streak}, best=${h.bestStreak}, 7d=${completionRate}`
    })

    let s = `HABITS (${habits.length} tracked):`
    s += `\n  Overall 7-day completion: ${pct(totalCompletions7, totalPossible7)}`
    const topStreak = [...habits].sort((a: any, b: any) => (b.streak || 0) - (a.streak || 0))[0] as any
    if (topStreak?.streak > 0) s += `\n  Longest active streak: "${topStreak.name}" at ${topStreak.streak} days`
    s += '\n' + habitStats.join('\n')
    sections.push(s)
  }

  // ═══ TASKS ANALYTICS ═══
  if (allTasks.length) {
    const done = allTasks.filter((t: any) => t.status === 'done')
    const pending = allTasks.filter((t: any) => t.status !== 'done')
    const overdue = pending.filter((t: any) => t.dueDate && t.dueDate < today)
    const urgent = pending.filter((t: any) => t.priority === 'urgent' || t.priority === 'high')

    let s = `TASKS (${allTasks.length} total, ${done.length} done, ${pending.length} pending):`
    if (overdue.length) s += `\n  ⚠ ${overdue.length} OVERDUE tasks`
    if (urgent.length) s += `\n  ${urgent.length} high/urgent priority pending`
    s += `\n  Completion rate: ${pct(done.length, allTasks.length)}`
    // List top pending
    const topPending = pending
      .sort((a: any, b: any) => {
        const prio: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
        return (prio[a.priority] ?? 2) - (prio[b.priority] ?? 2)
      })
      .slice(0, 10)
    if (topPending.length) {
      s += `\n  Top pending:`
      topPending.forEach((t: any) => {
        s += `\n    [${t.priority}] ${t.title}${t.dueDate ? ` (due: ${t.dueDate})` : ''} — ${t.status}`
      })
    }
    sections.push(s)
  }

  // ═══ GOALS ANALYTICS ═══
  if (goals.length) {
    const active = goals.filter((g: any) => g.status === 'active')
    const completed = goals.filter((g: any) => g.status === 'completed')
    let s = `GOALS (${goals.length} total, ${active.length} active, ${completed.length} completed):`
    goals.forEach((g: any) => {
      const progressPct = g.target ? Math.round((g.progress / g.target) * 100) : g.progress
      let line = `\n  - ${g.title}: ${progressPct}% (${g.progress}/${g.target} ${g.unit})`
      if (g.deadline) {
        const daysLeft = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000)
        line += daysLeft > 0 ? ` — ${daysLeft}d left` : ` — OVERDUE by ${Math.abs(daysLeft)}d`
      }
      line += ` [${g.status}]`
      s += line
    })
    sections.push(s)
  }

  // ═══ FITNESS / WORKOUT ANALYTICS ═══
  if (workouts90.length) {
    const w7 = workouts90.filter((w: any) => w.date >= sevenAgo)
    const w30 = workouts90.filter((w: any) => w.date >= thirtyAgo)

    // Volume computation
    const calcVolume = (workouts: any[]) =>
      workouts.reduce((total, w) =>
        total + (w.exercises || []).reduce((et: number, ex: any) =>
          et + (ex.sets || []).reduce((st: number, s: any) => st + (s.reps || 0) * (s.weight || 0), 0), 0), 0)

    const vol7 = calcVolume(w7)
    const vol30 = calcVolume(w30)
    const totalDuration7 = w7.reduce((s: number, w: any) => s + (w.duration || 0), 0)

    // Muscle group frequency
    const muscleMap: Record<string, string[]> = {
      Chest: ['Bench Press', 'Incline Bench Press', 'Dumbbell Press'],
      Back: ['Barbell Row', 'Pull-Up', 'Lat Pulldown', 'Cable Row', 'Face Pull'],
      Legs: ['Squat', 'Deadlift', 'Romanian Deadlift', 'Leg Press', 'Lunges', 'Hip Thrust', 'Calf Raise'],
      Shoulders: ['Overhead Press', 'Lateral Raise'],
      Arms: ['Bicep Curl', 'Tricep Pushdown'],
    }
    const muscleHits: Record<string, number> = {}
    w7.forEach((w: any) => {
      (w.exercises || []).forEach((ex: any) => {
        for (const [group, exercises] of Object.entries(muscleMap)) {
          if (exercises.some(e => ex.name?.includes(e))) {
            muscleHits[group] = (muscleHits[group] || 0) + (ex.sets?.length || 0)
          }
        }
      })
    })

    // PRs
    const prMap: Record<string, { weight: number; reps: number; date: string }> = {}
    workouts90.forEach((w: any) => {
      (w.exercises || []).forEach((ex: any) => {
        (ex.sets || []).forEach((s: any) => {
          const key = ex.name
          if (!key) return
          if (!prMap[key] || s.weight > prMap[key].weight) {
            prMap[key] = { weight: s.weight, reps: s.reps, date: w.date }
          }
        })
      })
    })

    let s = `FITNESS (${workouts90.length} workouts in 90d):`
    s += `\n  This week: ${w7.length} workouts, ${Math.round(vol7).toLocaleString()}kg volume, ${totalDuration7}min`
    s += `\n  This month: ${w30.length} workouts, ${Math.round(vol30).toLocaleString()}kg volume`
    s += `\n  Avg workouts/week (30d): ${(w30.length / 4.3).toFixed(1)}`
    if (Object.keys(muscleHits).length) {
      s += `\n  Muscle focus (7d sets): ${Object.entries(muscleHits).sort(([, a], [, b]) => b - a).map(([g, c]) => `${g}=${c}`).join(', ')}`
      const missing = Object.keys(muscleMap).filter(g => !muscleHits[g])
      if (missing.length) s += `\n  ⚠ Untrained this week: ${missing.join(', ')}`
    }
    // Top PRs
    const topPRs = Object.entries(prMap).sort(([, a], [, b]) => b.weight - a.weight).slice(0, 5)
    if (topPRs.length) {
      s += `\n  Top PRs (90d): ${topPRs.map(([name, pr]) => `${name} ${pr.weight}kg×${pr.reps}`).join(', ')}`
    }
    // Recent workouts list
    s += `\n  Recent:`
    workouts90.slice(0, 5).forEach((w: any) => {
      const exNames = (w.exercises || []).map((e: any) => e.name).filter(Boolean).join(', ')
      s += `\n    ${w.date}: ${w.name || 'Workout'} — ${exNames || 'no exercises'} (${w.duration || 0}min)`
    })
    sections.push(s)
  }

  // ═══ BODY COMPOSITION ANALYTICS ═══
  if (bodyLogs90.length) {
    const latest = bodyLogs90[0] as any
    const oldest = bodyLogs90[bodyLogs90.length - 1] as any
    const b7 = bodyLogs90.filter((b: any) => b.date >= sevenAgo)
    const weights = bodyLogs90.map((b: any) => b.weight).filter(Boolean) as number[]

    let s = `BODY COMPOSITION (${bodyLogs90.length} logs in 90d):`
    s += `\n  Current: ${latest.weight || '?'}kg`
    if (latest.bodyFat) s += `, ${latest.bodyFat}% BF`
    if (weights.length >= 2) {
      s += `\n  90-day change: ${delta(weights[0], weights[weights.length - 1])}kg`
      s += `\n  Min/Max (90d): ${Math.min(...weights).toFixed(1)} — ${Math.max(...weights).toFixed(1)}kg`
    }
    if (b7.length >= 2) {
      const w7 = b7.map((b: any) => b.weight).filter(Boolean) as number[]
      s += `\n  7-day trend: ${delta(w7[0], w7[w7.length - 1])}kg`
    }
    // Measurements
    const m = latest.measurements
    if (m) {
      const parts: string[] = []
      if (m.chest) parts.push(`chest=${m.chest}`)
      if (m.waist) parts.push(`waist=${m.waist}`)
      if (m.shoulders) parts.push(`shoulders=${m.shoulders}`)
      if (m.leftArm || m.arms) parts.push(`arms=${m.leftArm || m.arms}/${m.rightArm || m.arms}`)
      if (m.leftThigh || m.thighs) parts.push(`thighs=${m.leftThigh || m.thighs}/${m.rightThigh || m.thighs}`)
      if (parts.length) s += `\n  Latest measurements (cm): ${parts.join(', ')}`
    }
    sections.push(s)
  }

  // ═══ SLEEP ANALYTICS ═══
  if (sleepLogs30.length) {
    const s7 = sleepLogs30.filter((s: any) => s.date >= sevenAgo)
    const hours30 = sleepLogs30.map((s: any) => s.hours).filter(Boolean) as number[]
    const hours7 = s7.map((s: any) => s.hours).filter(Boolean) as number[]
    const quality30 = sleepLogs30.map((s: any) => s.quality).filter(Boolean) as number[]
    const quality7 = s7.map((s: any) => s.quality).filter(Boolean) as number[]

    let s = `SLEEP (${sleepLogs30.length} nights in 30d):`
    if (hours7.length) s += `\n  7-day avg: ${avg(hours7)}h, quality: ${avg(quality7)}/5`
    if (hours30.length) s += `\n  30-day avg: ${avg(hours30)}h, quality: ${avg(quality30)}/5`
    if (hours7.length && hours30.length) {
      s += `\n  Trend: ${delta(avg(hours7), avg(hours30))}h vs 30d avg`
    }
    const under6 = hours7.filter(h => h < 6).length
    if (under6) s += `\n  ⚠ ${under6} nights under 6h this week`
    // Bedtime consistency
    const bedtimes = s7.map((sl: any) => {
      const [h, m] = (sl.bedtime || '23:00').split(':').map(Number)
      return h >= 12 ? h * 60 + m : (h + 24) * 60 + m
    })
    if (bedtimes.length >= 3) {
      const avgBed = avg(bedtimes)
      const variance = avg(bedtimes.map(b => Math.abs(b - avgBed)))
      const bedH = Math.floor(avgBed / 60) % 24
      const bedM = Math.round(avgBed % 60)
      s += `\n  Avg bedtime: ${String(bedH).padStart(2, '0')}:${String(bedM).padStart(2, '0')}`
      s += variance > 30 ? ` (inconsistent ±${Math.round(variance)}min)` : ` (consistent)`
    }
    // Recent
    s += `\n  Recent:`
    sleepLogs30.slice(0, 5).forEach((sl: any) => {
      s += `\n    ${sl.date}: ${sl.bedtime}→${sl.waketime}, ${sl.hours}h, quality=${sl.quality}/5`
    })
    sections.push(s)
  }

  // ═══ NUTRITION ANALYTICS ═══
  if (meals30.length) {
    // Group by date
    const byDate: Record<string, any[]> = {}
    meals30.forEach((m: any) => { (byDate[m.date] = byDate[m.date] || []).push(m) })
    const dates = Object.keys(byDate).sort().reverse()
    const dailyTotals = dates.map(d => {
      const ms = byDate[d]
      return {
        date: d,
        calories: ms.reduce((s: number, m: any) => s + (m.calories || 0), 0),
        protein: ms.reduce((s: number, m: any) => s + (m.protein || 0), 0),
        carbs: ms.reduce((s: number, m: any) => s + (m.carbs || 0), 0),
        fat: ms.reduce((s: number, m: any) => s + (m.fat || 0), 0),
        meals: ms.length,
      }
    })

    const recent7 = dailyTotals.slice(0, 7)
    const avgCal = avg(recent7.map(d => d.calories))
    const avgProt = avg(recent7.map(d => d.protein))
    const avgCarbs = avg(recent7.map(d => d.carbs))
    const avgFat = avg(recent7.map(d => d.fat))

    let s = `NUTRITION (${meals30.length} meals logged in 30d, ${dates.length} days):`
    s += `\n  7-day daily avg: ${avgCal} cal, ${avgProt}g protein, ${avgCarbs}g carbs, ${avgFat}g fat`
    if (dailyTotals.length >= 2) {
      const todayD = dailyTotals.find(d => d.date === today)
      if (todayD) s += `\n  Today: ${todayD.calories} cal, ${todayD.protein}g protein (${todayD.meals} meals)`
    }
    // Consistency
    const daysLogged7 = recent7.filter(d => d.calories > 0).length
    s += `\n  Logging consistency (7d): ${daysLogged7}/7 days`
    sections.push(s)
  }

  // ═══ WATER ANALYTICS ═══
  if (waterLogs30.length) {
    const w7 = waterLogs30.filter((w: any) => w.date >= sevenAgo)
    const glasses7 = w7.map((w: any) => w.glasses) as number[]
    const goals7 = w7.map((w: any) => w.goal || 8) as number[]
    const daysHit = w7.filter((w: any) => w.glasses >= (w.goal || 8)).length
    const todayW = waterLogs30.find((w: any) => w.date === today)

    let s = `WATER (${waterLogs30.length} days in 30d):`
    if (glasses7.length) s += `\n  7-day avg: ${avg(glasses7)} glasses/day`
    s += `\n  Goal hit rate (7d): ${daysHit}/${w7.length} days`
    if (todayW) s += `\n  Today: ${todayW.glasses}/${todayW.goal || 8} glasses`
    sections.push(s)
  }

  // ═══ EXPENSES ANALYTICS ═══
  if (expenses90.length) {
    const e30 = expenses90.filter((e: any) => e.date >= thirtyAgo)
    const total30 = e30.reduce((s: number, e: any) => s + (e.amount || 0), 0)
    const total90 = expenses90.reduce((s: number, e: any) => s + (e.amount || 0), 0)

    // Category breakdown
    const byCat: Record<string, number> = {}
    e30.forEach((e: any) => { byCat[e.category || 'other'] = (byCat[e.category || 'other'] || 0) + (e.amount || 0) })
    const sortedCats = Object.entries(byCat).sort(([, a], [, b]) => b - a)

    let s = `EXPENSES:`
    s += `\n  30-day total: $${total30.toFixed(2)} (${e30.length} transactions)`
    s += `\n  90-day total: $${total90.toFixed(2)}`
    s += `\n  Monthly avg (90d): $${(total90 / 3).toFixed(2)}`
    if (sortedCats.length) {
      s += `\n  Top categories (30d): ${sortedCats.slice(0, 5).map(([cat, amt]) => `${cat}=$${amt.toFixed(0)}`).join(', ')}`
    }
    const recurring = e30.filter((e: any) => e.recurring)
    if (recurring.length) {
      const recTotal = recurring.reduce((s: number, e: any) => s + (e.amount || 0), 0)
      s += `\n  Recurring: $${recTotal.toFixed(2)}/month (${recurring.length} items)`
    }
    sections.push(s)
  }

  // ═══ GRATITUDE ═══
  if (gratitude30.length) {
    const recent = gratitude30.slice(0, 5)
    let s = `GRATITUDE (${gratitude30.length} entries in 30d):`
    recent.forEach((g: any) => {
      s += `\n  ${g.date}: ${g.items?.join(', ') || g.highlight || ''}`
    })
    sections.push(s)
  }

  // ═══ READING ═══
  if (books.length) {
    const reading = books.filter((b: any) => b.status === 'reading')
    const completed = books.filter((b: any) => b.status === 'completed')
    const wantToRead = books.filter((b: any) => b.status === 'want-to-read')

    let s = `READING (${books.length} books: ${reading.length} reading, ${completed.length} completed, ${wantToRead.length} want-to-read):`
    reading.forEach((b: any) => {
      const progress = b.totalPages ? `${Math.round((b.pagesRead / b.totalPages) * 100)}%` : '?'
      s += `\n  📖 "${b.title}" by ${b.author} — ${progress} (${b.pagesRead}/${b.totalPages}p)`
    })
    if (completed.length) {
      const recentlyDone = completed.filter((b: any) => b.finishDate).sort((a: any, b: any) => b.finishDate.localeCompare(a.finishDate)).slice(0, 3)
      recentlyDone.forEach((b: any) => {
        s += `\n  ✓ "${b.title}" by ${b.author}${b.rating ? ` — ${b.rating}/5★` : ''}`
      })
    }
    sections.push(s)
  }

  // ═══ CROSS-DOMAIN CORRELATIONS ═══
  const correlations: string[] = []

  // Sleep vs Mood correlation
  if (journals90.length >= 7 && sleepLogs30.length >= 7) {
    const sleepByDate: Record<string, number> = {}
    sleepLogs30.forEach((s: any) => { sleepByDate[s.date] = s.hours })
    const paired = journals90
      .filter((j: any) => sleepByDate[j.date] !== undefined)
      .slice(0, 14)
    if (paired.length >= 5) {
      const goodSleep = paired.filter((j: any) => sleepByDate[j.date] >= 7)
      const poorSleep = paired.filter((j: any) => sleepByDate[j.date] < 6)
      const goodMood = avg(goodSleep.map((j: any) => j.mood || 3))
      const poorMood = avg(poorSleep.map((j: any) => j.mood || 3))
      if (goodSleep.length >= 2 && poorSleep.length >= 2 && goodMood !== poorMood) {
        correlations.push(`Sleep→Mood: ${goodMood}/5 mood on 7h+ nights vs ${poorMood}/5 on <6h nights`)
      }
    }
  }

  // Workout vs Mood correlation
  if (journals90.length >= 7 && workouts90.length >= 5) {
    const workoutDates = new Set(workouts90.map((w: any) => w.date))
    const recent = journals90.slice(0, 30)
    const gymDays = recent.filter((j: any) => workoutDates.has(j.date))
    const restDays = recent.filter((j: any) => !workoutDates.has(j.date))
    if (gymDays.length >= 3 && restDays.length >= 3) {
      const gymMood = avg(gymDays.map((j: any) => j.mood || 3))
      const restMood = avg(restDays.map((j: any) => j.mood || 3))
      if (gymMood !== restMood) {
        correlations.push(`Workout→Mood: ${gymMood}/5 on gym days vs ${restMood}/5 on rest days`)
      }
    }
  }

  if (correlations.length) {
    sections.push(`CROSS-DOMAIN INSIGHTS:\n  ${correlations.join('\n  ')}`)
  }

  return sections.join('\n\n')
}
