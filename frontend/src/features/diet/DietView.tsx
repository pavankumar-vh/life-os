'use client'

import { useEffect, useState, useMemo } from 'react'
import { useMealsStore, useSettingsStore, useWaterStore } from '@/store'
import { toISODate } from '@/lib/utils'
import { ListSkeleton } from '@/components/Skeletons'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, X, Apple, Utensils, Copy, Sunrise, Sun, Moon as MoonIcon,
  Droplets, Flame, ChevronDown, Zap, Leaf, Target, BarChart3, Award, Coffee,
  Cookie, CircleEllipsis
} from 'lucide-react'
import { DateNavigator } from '@/components/DateNavigator'
import { toast } from '@/components/Toast'

/* ────── constants ────── */
const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', icon: Sunrise, color: '#FBBF24' },
  { value: 'morning_snack', label: 'Snack', icon: Cookie, color: '#F472B6' },
  { value: 'lunch', label: 'Lunch', icon: Sun, color: '#34D399' },
  { value: 'snack', label: 'Snack', icon: Coffee, color: '#A78BFA' },
  { value: 'dinner', label: 'Dinner', icon: MoonIcon, color: '#60A5FA' },
  { value: 'other', label: 'Other', icon: CircleEllipsis, color: '#94A3B8' },
] as const

const QUICK_ADDS = [
  { name: 'Egg (1 large)', cal: 72, p: 6, c: 0, f: 5, fi: 0, s: 0 },
  { name: 'Banana', cal: 105, p: 1, c: 27, f: 0, fi: 3, s: 14 },
  { name: 'Chicken Breast (100g)', cal: 165, p: 31, c: 0, f: 4, fi: 0, s: 0 },
  { name: 'Rice (1 cup cooked)', cal: 206, p: 4, c: 45, f: 0, fi: 1, s: 0 },
  { name: 'Whey Protein Scoop', cal: 120, p: 24, c: 3, f: 1, fi: 0, s: 1 },
  { name: 'Almonds (28g)', cal: 164, p: 6, c: 6, f: 14, fi: 4, s: 1 },
  { name: 'Greek Yogurt (170g)', cal: 100, p: 17, c: 6, f: 1, fi: 0, s: 4 },
  { name: 'Oats (40g dry)', cal: 150, p: 5, c: 27, f: 3, fi: 4, s: 1 },
  { name: 'Sweet Potato (150g)', cal: 130, p: 2, c: 30, f: 0, fi: 4, s: 6 },
  { name: 'Salmon (100g)', cal: 208, p: 20, c: 0, f: 13, fi: 0, s: 0 },
  { name: 'Avocado (half)', cal: 120, p: 1, c: 6, f: 11, fi: 5, s: 0 },
  { name: 'Bread (1 slice)', cal: 80, p: 3, c: 14, f: 1, fi: 1, s: 2 },
]

/* ────── SVG calorie ring ────── */
function CalorieRing({ consumed, goal, size = 180 }: { consumed: number; goal: number; size?: number }) {
  const stroke = 12
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(consumed / Math.max(goal, 1), 1.3)
  const offset = circ - pct * circ
  const remaining = Math.max(0, goal - consumed)
  const isOver = consumed > goal

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={isOver ? '#f87171' : 'url(#calorieGrad)'}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: Math.max(0, offset) }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        />
        <defs>
          <linearGradient id="calorieGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e8d5b7" />
            <stop offset="100%" stopColor="#c9a87c" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.p className="text-3xl font-bold text-text-primary"
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}>{consumed}</motion.p>
        <p className="text-[11px] text-text-muted -mt-0.5">kcal eaten</p>
        <div className="h-px w-10 bg-border my-1.5" />
        <p className={`text-sm font-semibold ${isOver ? 'text-red-soft' : 'text-accent'}`}>
          {isOver ? `+${consumed - goal}` : remaining}
        </p>
        <p className="text-[10px] text-text-muted">{isOver ? 'over' : 'remaining'}</p>
      </div>
    </div>
  )
}

/* ────── Macro progress bar ────── */
function MacroBar({ label, value, goal, unit, color, icon: Icon }: {
  label: string; value: number; goal: number; unit: string; color: string; icon: React.ElementType
}) {
  const pct = Math.min(100, (value / Math.max(goal, 1)) * 100)
  const isOver = value > goal
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={13} className={color} />
        <span className="text-[11px] text-text-muted">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color}`}>
        {value}<span className="text-xs font-normal text-text-muted">/{goal}{unit}</span>
      </p>
      <div className="h-1.5 bg-bg-elevated border border-border rounded-full overflow-hidden mt-1">
        <motion.div
          className={`h-full rounded-full ${isOver ? 'bg-red-soft' : ''}`}
          style={!isOver ? { background: color.includes('#') ? color : undefined,
            ...(color === 'text-green-soft' ? { background: '#4ade80' } :
               color === 'text-blue-soft' ? { background: '#60a5fa' } :
               color === 'text-orange-soft' ? { background: '#fb923c' } : {}) } : undefined}
          initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}

/* ────── Nutrition score ────── */
function NutritionScore({ protein, carbs, fat, calories, goal }: {
  protein: number; carbs: number; fat: number; calories: number; goal: number
}) {
  const totalMacroCal = protein * 4 + carbs * 4 + fat * 9
  const proteinPct = totalMacroCal > 0 ? (protein * 4 / totalMacroCal) * 100 : 0
  const carbsPct = totalMacroCal > 0 ? (carbs * 4 / totalMacroCal) * 100 : 0
  const fatPct = totalMacroCal > 0 ? (fat * 9 / totalMacroCal) * 100 : 0

  const balanceScore = Math.max(0, 100 -
    Math.abs(proteinPct - 30) * 1.5 -
    Math.abs(carbsPct - 40) -
    Math.abs(fatPct - 30) * 1.5
  )
  const calorieScore = calories > 0 ? Math.max(0, 100 - Math.abs(calories - goal) / Math.max(goal, 1) * 100) : 0
  const score = calories > 0 ? Math.round(balanceScore * 0.6 + calorieScore * 0.4) : 0
  const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F'
  const gradeColor = score >= 85 ? 'text-green-soft' : score >= 70 ? 'text-accent' : score >= 55 ? 'text-yellow-400' : score >= 40 ? 'text-orange-soft' : 'text-red-soft'

  return (
    <div className="flex items-center gap-3 w-full mt-2">
      <div className={`text-2xl font-black ${gradeColor}`}>{grade}</div>
      <div className="flex-1">
        <div className="h-1.5 bg-bg-elevated border border-border rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #f87171, #fbbf24, #34d399)' }}
            initial={{ width: 0 }} animate={{ width: `${score}%` }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[10px] text-text-muted">Nutrition Score</span>
          <span className="text-[10px] text-text-muted">{score}/100</span>
        </div>
      </div>
    </div>
  )
}

/* ────── Macro donut ────── */
function MacroDonut({ protein, carbs, fat, size = 64 }: { protein: number; carbs: number; fat: number; size?: number }) {
  const total = protein * 4 + carbs * 4 + fat * 9
  if (total === 0) return <div className="rounded-full bg-bg-elevated border border-border" style={{ width: size, height: size }} />

  const pPct = (protein * 4 / total) * 100
  const cPct = (carbs * 4 / total) * 100
  const r = 26
  const circ = 2 * Math.PI * r

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#4ade80" strokeWidth={10}
        strokeDasharray={`${(pPct / 100) * circ} ${circ}`} strokeDashoffset={0} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#60a5fa" strokeWidth={10}
        strokeDasharray={`${(cPct / 100) * circ} ${circ}`} strokeDashoffset={-((pPct / 100) * circ)} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#fb923c" strokeWidth={10}
        strokeDasharray={`${((100 - pPct - cPct) / 100) * circ} ${circ}`}
        strokeDashoffset={-((pPct / 100 + cPct / 100) * circ)} />
    </svg>
  )
}

/* ════════════════════════════════════════════════════════════ */
/*                       MAIN COMPONENT                       */
/* ════════════════════════════════════════════════════════════ */
export function DietView() {
  const { meals, isLoading, fetchMeals, addMeal, deleteMeal } = useMealsStore()
  const { logs: waterLogs, fetchLogs: fetchWater, logWater } = useWaterStore()
  const GOALS = useSettingsStore(s => s.goals)
  const [showAdd, setShowAdd] = useState(false)
  const [mealName, setMealName] = useState('')
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast')
  const [calories, setCalories] = useState(0)
  const [protein, setProtein] = useState(0)
  const [carbs, setCarbs] = useState(0)
  const [fat, setFat] = useState(0)
  const [fiber, setFiber] = useState(0)
  const [sugar, setSugar] = useState(0)
  const [selectedDate, setSelectedDate] = useState(toISODate())
  const [expandedType, setExpandedType] = useState<string | null>(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const today = toISODate()

  useEffect(() => { fetchMeals(selectedDate).catch(() => toast.error('Failed to load meals')) }, [fetchMeals, selectedDate])
  useEffect(() => { fetchWater().catch(() => {}) }, [fetchWater])

  const totals = useMemo(() => ({
    calories: meals.reduce((s, m) => s + (m.calories || 0), 0),
    protein: meals.reduce((s, m) => s + (m.protein || 0), 0),
    carbs: meals.reduce((s, m) => s + (m.carbs || 0), 0),
    fat: meals.reduce((s, m) => s + (m.fat || 0), 0),
    fiber: meals.reduce((s, m) => s + (m.fiber || 0), 0),
    sugar: meals.reduce((s, m) => s + (m.sugar || 0), 0),
  }), [meals])

  const mealsByType = useMemo(() => {
    const grouped: Record<string, typeof meals> = {}
    MEAL_TYPES.forEach(t => { grouped[t.value] = meals.filter(m => m.type === t.value) })
    return grouped
  }, [meals])

  const waterLog = useMemo(() => {
    return waterLogs.find(l => l.date === selectedDate) || { glasses: 0, goal: GOALS.water || 8 }
  }, [waterLogs, selectedDate, GOALS.water])

  const resetForm = () => {
    setMealName(''); setCalories(0); setProtein(0); setCarbs(0); setFat(0); setFiber(0); setSugar(0)
  }

  const handleAdd = async () => {
    if (!mealName.trim()) return
    await addMeal({ date: selectedDate, name: mealName, type: mealType, calories, protein, carbs, fat, fiber, sugar })
      .catch(() => toast.error('Failed to add meal'))
    resetForm()
    setShowAdd(false)
    setShowQuickAdd(false)
  }

  const handleQuickAdd = (item: typeof QUICK_ADDS[0]) => {
    setMealName(item.name); setCalories(item.cal); setProtein(item.p); setCarbs(item.c)
    setFat(item.f); setFiber(item.fi); setSugar(item.s); setShowQuickAdd(false)
  }

  const repeatMeal = (meal: typeof meals[0]) => {
    setMealName(meal.name); setMealType(meal.type); setCalories(meal.calories)
    setProtein(meal.protein); setCarbs(meal.carbs); setFat(meal.fat)
    setFiber(meal.fiber || 0); setSugar(meal.sugar || 0); setShowAdd(true)
  }

  const handleWaterAdd = () => {
    logWater({ date: selectedDate, glasses: waterLog.glasses + 1, goal: waterLog.goal }).catch(() => toast.error('Failed to log water'))
  }

  const handleWaterRemove = () => {
    if (waterLog.glasses <= 0) return
    logWater({ date: selectedDate, glasses: waterLog.glasses - 1, goal: waterLog.goal }).catch(() => {})
  }

  const macroCalTotal = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9
  const proteinPct = macroCalTotal > 0 ? Math.round((totals.protein * 4 / macroCalTotal) * 100) : 0
  const carbsPct = macroCalTotal > 0 ? Math.round((totals.carbs * 4 / macroCalTotal) * 100) : 0
  const fatPct = macroCalTotal > 0 ? Math.round((totals.fat * 9 / macroCalTotal) * 100) : 0

  const mealTypeCalories = useMemo(() => {
    return MEAL_TYPES.map(t => ({
      ...t,
      calories: (mealsByType[t.value] || []).reduce((s, m) => s + m.calories, 0),
      count: (mealsByType[t.value] || []).length,
    }))
  }, [mealsByType])

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Apple className="w-6 h-6 text-accent" /> Nutrition
          </h1>
          <DateNavigator value={selectedDate} onChange={setSelectedDate} />
        </div>
        <button onClick={() => { resetForm(); setShowAdd(true) }} className="btn flex items-center gap-2">
          <Plus className="w-4 h-4" /> Log Meal
        </button>
      </div>

      {/* ═══ Hero: Calorie Ring + Macros ═══ */}
      <div className="card mb-4 overflow-hidden">
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
          {/* Calorie Ring */}
          <div className="flex flex-col items-center shrink-0">
            <CalorieRing consumed={totals.calories} goal={GOALS.calories} />
            <NutritionScore protein={totals.protein} carbs={totals.carbs} fat={totals.fat}
              calories={totals.calories} goal={GOALS.calories} />
          </div>

          {/* Macros + extras */}
          <div className="flex-1 w-full">
            <div className="flex items-center gap-4 mb-4">
              <MacroDonut protein={totals.protein} carbs={totals.carbs} fat={totals.fat} />
              <div className="flex gap-4 text-[11px] flex-wrap">
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-green-soft" /> Protein {proteinPct}%</div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-soft" /> Carbs {carbsPct}%</div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-orange-soft" /> Fat {fatPct}%</div>
              </div>
            </div>
            <div className="flex gap-4">
              <MacroBar label="Protein" value={totals.protein} goal={GOALS.protein} unit="g" color="text-green-soft" icon={Zap} />
              <MacroBar label="Carbs" value={totals.carbs} goal={GOALS.carbs} unit="g" color="text-blue-soft" icon={Flame} />
              <MacroBar label="Fat" value={totals.fat} goal={GOALS.fat} unit="g" color="text-orange-soft" icon={Target} />
            </div>
            {/* Extra nutrients + water */}
            <div className="flex gap-4 mt-3 pt-3 border-t border-border/50 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Leaf size={13} className="text-green-soft/70" />
                <span className="text-xs text-text-muted">Fiber</span>
                <span className="text-xs font-semibold text-text-primary">{totals.fiber}g</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px]">🍬</span>
                <span className="text-xs text-text-muted">Sugar</span>
                <span className="text-xs font-semibold text-text-primary">{totals.sugar}g</span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <Droplets size={13} className="text-blue-soft/70" />
                <span className="text-xs text-text-muted">Water</span>
                <span className="text-xs font-semibold text-text-primary">{waterLog.glasses}/{waterLog.goal}</span>
                <button onClick={handleWaterAdd}
                  className="w-5 h-5 rounded-full bg-blue-soft/20 text-blue-soft flex items-center justify-center hover:bg-blue-soft/30 transition-colors">
                  <Plus size={11} />
                </button>
                <button onClick={handleWaterRemove}
                  className="w-5 h-5 rounded-full bg-bg-elevated border border-border text-text-muted flex items-center justify-center hover:bg-bg-hover transition-colors">
                  <span className="text-xs leading-none">−</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Meal Type Quick Cards ═══ */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        {mealTypeCalories.map(mt => (
          <button key={mt.value}
            onClick={() => { resetForm(); setMealType(mt.value as typeof mealType); setShowAdd(true) }}
            className="bg-bg-elevated border border-border rounded-xl p-3 text-center hover:border-border-strong transition-all group cursor-pointer">
            <mt.icon size={16} className="mx-auto mb-1 text-text-muted group-hover:text-accent transition-colors"
              style={{ color: mt.count > 0 ? mt.color : undefined }} />
            <p className="text-xs font-medium text-text-primary">{mt.label}</p>
            <p className="text-sm font-bold" style={{ color: mt.calories > 0 ? mt.color : 'var(--text-muted)' }}>
              {mt.calories || '—'}
            </p>
            <p className="text-[10px] text-text-muted">
              {mt.count > 0 ? `${mt.count} item${mt.count > 1 ? 's' : ''}` : 'Tap to add'}
            </p>
          </button>
        ))}
      </div>

      {/* ═══ Add Meal Panel ═══ */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
            <div className="card border-accent/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Utensils size={14} className="text-accent" /> Log Meal
                </h3>
                <button onClick={() => { setShowAdd(false); setShowQuickAdd(false) }}
                  className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
              </div>

              {/* Meal type selector */}
              <div className="flex gap-2 mb-3">
                {MEAL_TYPES.map(t => (
                  <button key={t.value} onClick={() => setMealType(t.value as typeof mealType)}
                    className={`flex-1 py-2 rounded-lg text-xs transition-all flex flex-col items-center gap-1 ${
                      mealType === t.value
                        ? 'bg-accent/20 text-accent font-medium ring-1 ring-accent/30'
                        : 'bg-bg-elevated border border-border text-text-muted hover:bg-bg-hover'
                    }`}>
                    <t.icon size={14} />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Quick add toggle */}
              <button onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="w-full text-left text-xs text-accent hover:text-accent/80 mb-3 flex items-center gap-1">
                <Zap size={12} /> Quick Add Common Foods
                <motion.span animate={{ rotate: showQuickAdd ? 180 : 0 }} className="inline-block">
                  <ChevronDown size={12} />
                </motion.span>
              </button>

              {/* Quick add grid */}
              <AnimatePresence>
                {showQuickAdd && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 p-3 bg-bg-elevated border border-border rounded-lg">
                      {QUICK_ADDS.map(item => (
                        <button key={item.name} onClick={() => handleQuickAdd(item)}
                          className="text-left p-2 rounded-md hover:bg-bg-hover transition-colors">
                          <p className="text-xs font-medium text-text-primary truncate">{item.name}</p>
                          <p className="text-[10px] text-text-muted">{item.cal} kcal · P{item.p} C{item.c} F{item.f}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <input type="text" value={mealName} onChange={(e) => setMealName(e.target.value)}
                placeholder="What did you eat?" className="input w-full mb-3"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()} autoFocus />

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-[10px] text-text-secondary uppercase block mb-1">Calories</label>
                  <input type="number" value={calories || ''} onChange={(e) => setCalories(Number(e.target.value))}
                    className="input text-xs" placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary uppercase block mb-1">Protein (g)</label>
                  <input type="number" value={protein || ''} onChange={(e) => setProtein(Number(e.target.value))}
                    className="input text-xs" placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary uppercase block mb-1">Carbs (g)</label>
                  <input type="number" value={carbs || ''} onChange={(e) => setCarbs(Number(e.target.value))}
                    className="input text-xs" placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary uppercase block mb-1">Fat (g)</label>
                  <input type="number" value={fat || ''} onChange={(e) => setFat(Number(e.target.value))}
                    className="input text-xs" placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary uppercase block mb-1">Fiber (g)</label>
                  <input type="number" value={fiber || ''} onChange={(e) => setFiber(Number(e.target.value))}
                    className="input text-xs" placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] text-text-secondary uppercase block mb-1">Sugar (g)</label>
                  <input type="number" value={sugar || ''} onChange={(e) => setSugar(Number(e.target.value))}
                    className="input text-xs" placeholder="0" />
                </div>
              </div>

              {/* Live preview */}
              {calories > 0 && (
                <div className="flex items-center gap-3 p-2 bg-bg-elevated border border-border rounded-lg mb-3 text-[11px] flex-wrap">
                  <span className="text-accent font-medium">{calories} kcal</span>
                  <span className="text-green-soft">P {protein}g</span>
                  <span className="text-blue-soft">C {carbs}g</span>
                  <span className="text-orange-soft">F {fat}g</span>
                  {fiber > 0 && <span className="text-text-muted">Fi {fiber}g</span>}
                  {sugar > 0 && <span className="text-text-muted">Su {sugar}g</span>}
                </div>
              )}

              <button onClick={handleAdd} disabled={!mealName.trim()}
                className="btn w-full disabled:opacity-40 disabled:cursor-not-allowed">
                Save Meal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Meals Timeline ═══ */}
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : meals.length === 0 ? (
        <div className="text-center py-16 card">
          <Apple className="w-10 h-10 text-text-muted/30 mx-auto mb-3" />
          <p className="text-sm text-text-muted mb-1">
            No meals logged {selectedDate === today ? 'today' : 'for this day'}
          </p>
          <p className="text-xs text-text-muted">Tap the + button or meal type cards above to start tracking</p>
        </div>
      ) : (
        <div className="space-y-3">
          {MEAL_TYPES.map(type => {
            const typeMeals = mealsByType[type.value] || []
            if (typeMeals.length === 0) return null
            const typeCal = typeMeals.reduce((s, m) => s + m.calories, 0)
            const typeProtein = typeMeals.reduce((s, m) => s + m.protein, 0)
            const isExpanded = expandedType === type.value || expandedType === null

            return (
              <div key={type.value} className="card !p-0 overflow-hidden">
                {/* Meal type header */}
                <button onClick={() => setExpandedType(expandedType === type.value ? null : type.value)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-bg-hover transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${type.color}20` }}>
                    <type.icon size={16} style={{ color: type.color }} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-text-primary">{type.label}</p>
                    <p className="text-[11px] text-text-muted">
                      {typeMeals.length} item{typeMeals.length > 1 ? 's' : ''} · {typeProtein}g protein
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold" style={{ color: type.color }}>{typeCal}</p>
                    <p className="text-[10px] text-text-muted">kcal</p>
                  </div>
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={16} className="text-text-muted" />
                  </motion.div>
                </button>

                {/* Expanded meals */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      className="overflow-hidden">
                      <div className="border-t border-border/50">
                        {typeMeals.map((meal, idx) => (
                          <div key={meal._id}
                            className={`flex items-center gap-3 px-4 py-3 group hover:bg-bg-hover transition-colors ${
                              idx < typeMeals.length - 1 ? 'border-b border-border/30' : ''
                            }`}>
                            <div className="w-1 h-8 rounded-full" style={{ backgroundColor: type.color, opacity: 0.4 }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-text-primary">{meal.name}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[11px] text-accent font-medium">{meal.calories} kcal</span>
                                <span className="text-[11px] text-green-soft">P {meal.protein}g</span>
                                <span className="text-[11px] text-blue-soft">C {meal.carbs}g</span>
                                <span className="text-[11px] text-orange-soft">F {meal.fat}g</span>
                                {(meal.fiber || 0) > 0 && <span className="text-[11px] text-text-muted">Fi {meal.fiber}g</span>}
                                {(meal.sugar || 0) > 0 && <span className="text-[11px] text-text-muted">Su {meal.sugar}g</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button onClick={() => repeatMeal(meal)}
                                className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-colors" title="Repeat">
                                <Copy size={13} />
                              </button>
                              <button onClick={() => deleteMeal(meal._id).catch(() => toast.error('Failed to delete'))}
                                className="p-1.5 rounded-md text-text-muted hover:text-red-soft hover:bg-red-soft/10 transition-colors" title="Delete">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}

      {/* ═══ Daily Insights ═══ */}
      {meals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {/* Calorie distribution */}
          <div className="card">
            <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5">
              <BarChart3 size={13} /> Calorie Distribution
            </h3>
            <div className="space-y-2">
              {mealTypeCalories.filter(mt => mt.calories > 0).map(mt => {
                const pct = totals.calories > 0 ? (mt.calories / totals.calories) * 100 : 0
                return (
                  <div key={mt.value} className="flex items-center gap-3">
                    <mt.icon size={14} style={{ color: mt.color }} className="shrink-0" />
                    <span className="text-xs text-text-muted w-16">{mt.label}</span>
                    <div className="flex-1 h-2 bg-bg-elevated border border-border rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: mt.color }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
                    </div>
                    <span className="text-xs font-medium text-text-primary w-14 text-right">{mt.calories}</span>
                    <span className="text-[10px] text-text-muted w-8">{Math.round(pct)}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="card">
            <h3 className="text-xs font-medium text-text-muted mb-3 flex items-center gap-1.5">
              <Award size={13} /> Daily Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 bg-bg-elevated border border-border rounded-lg">
                <p className="text-lg font-bold text-accent">{totals.calories}</p>
                <p className="text-[10px] text-text-muted">Total Calories</p>
              </div>
              <div className="text-center p-2 bg-bg-elevated border border-border rounded-lg">
                <p className="text-lg font-bold text-text-primary">{meals.length}</p>
                <p className="text-[10px] text-text-muted">Meals Logged</p>
              </div>
              <div className="text-center p-2 bg-bg-elevated border border-border rounded-lg">
                <p className="text-lg font-bold text-green-soft">{totals.protein}g</p>
                <p className="text-[10px] text-text-muted">Total Protein</p>
              </div>
              <div className="text-center p-2 bg-bg-elevated border border-border rounded-lg">
                <p className="text-lg font-bold text-blue-soft">{waterLog.glasses}/{waterLog.goal}</p>
                <p className="text-[10px] text-text-muted">Glasses Water</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50 text-center">
              <p className="text-xs text-text-muted">
                {totals.calories < GOALS.calories * 0.8
                  ? "⚠️ You're undereating — try to eat more to reach your goal"
                  : totals.calories > GOALS.calories * 1.1
                  ? '🔴 You\'ve exceeded your calorie goal'
                  : totals.protein >= GOALS.protein
                  ? '💪 Great protein intake today!'
                  : '🎯 You\'re on track — keep going!'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
