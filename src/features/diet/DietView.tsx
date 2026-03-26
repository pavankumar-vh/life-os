'use client'

import { useEffect, useState, useMemo } from 'react'
import { useMealsStore } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, X, Apple, Utensils, Copy, ChevronLeft, ChevronRight, Sunrise, Sun, Moon as MoonIcon } from 'lucide-react'

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast', icon: Sunrise },
  { value: 'lunch', label: 'Lunch', icon: Sun },
  { value: 'dinner', label: 'Dinner', icon: MoonIcon },
  { value: 'snack', label: 'Snack', icon: Apple },
]

const MACRO_GOALS = { calories: 2200, protein: 150, carbs: 250, fat: 70 }

export function DietView() {
  const { meals, isLoading, fetchMeals, addMeal, deleteMeal } = useMealsStore()
  const [showAdd, setShowAdd] = useState(false)
  const [mealName, setMealName] = useState('')
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast')
  const [calories, setCalories] = useState(0)
  const [protein, setProtein] = useState(0)
  const [carbs, setCarbs] = useState(0)
  const [fat, setFat] = useState(0)
  const [selectedDate, setSelectedDate] = useState(toISODate())
  const today = toISODate()

  useEffect(() => { fetchMeals(selectedDate).catch(() => {}) }, [fetchMeals, selectedDate])

  const totals = useMemo(() => ({
    calories: meals.reduce((s, m) => s + m.calories, 0),
    protein: meals.reduce((s, m) => s + m.protein, 0),
    carbs: meals.reduce((s, m) => s + m.carbs, 0),
    fat: meals.reduce((s, m) => s + m.fat, 0),
  }), [meals])

  const handleAdd = async () => {
    if (!mealName.trim()) return
    await addMeal({ date: selectedDate, name: mealName, type: mealType, calories, protein, carbs, fat })
    setMealName('')
    setCalories(0)
    setProtein(0)
    setCarbs(0)
    setFat(0)
    setShowAdd(false)
  }

  const repeatMeal = (meal: typeof meals[0]) => {
    setMealName(meal.name)
    setMealType(meal.type)
    setCalories(meal.calories)
    setProtein(meal.protein)
    setCarbs(meal.carbs)
    setFat(meal.fat)
    setShowAdd(true)
  }

  const navigateDate = (offset: number) => {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + offset)
    setSelectedDate(toISODate(d))
  }

  const mealsByType = useMemo(() => {
    const grouped: Record<string, typeof meals> = {}
    MEAL_TYPES.forEach(t => { grouped[t.value] = meals.filter(m => m.type === t.value) })
    return grouped
  }, [meals])

  const macros = [
    { label: 'Calories', value: totals.calories, goal: MACRO_GOALS.calories, unit: 'kcal', color: 'bg-accent', textColor: 'text-accent' },
    { label: 'Protein', value: totals.protein, goal: MACRO_GOALS.protein, unit: 'g', color: 'bg-green-soft', textColor: 'text-green-soft' },
    { label: 'Carbs', value: totals.carbs, goal: MACRO_GOALS.carbs, unit: 'g', color: 'bg-blue-soft', textColor: 'text-blue-soft' },
    { label: 'Fat', value: totals.fat, goal: MACRO_GOALS.fat, unit: 'g', color: 'bg-orange-soft', textColor: 'text-orange-soft' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Apple className="w-6 h-6 text-accent" /> Diet
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => navigateDate(-1)} className="text-text-muted hover:text-text-primary"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-text-muted text-sm">{selectedDate === today ? 'Today' : formatDate(selectedDate)}</span>
            <button onClick={() => navigateDate(1)} className="text-text-muted hover:text-text-primary" disabled={selectedDate === today}>
              <ChevronRight className={`w-4 h-4 ${selectedDate === today ? 'opacity-30' : ''}`} />
            </button>
            {selectedDate !== today && (
              <button onClick={() => setSelectedDate(today)} className="text-accent text-xs hover:underline ml-2">Today</button>
            )}
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn flex items-center gap-2"><Plus className="w-4 h-4" /> Log Meal</button>
      </div>

      {/* Macro Progress */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {macros.map(m => {
          const pct = Math.min(100, (m.value / m.goal) * 100)
          const isOver = m.value > m.goal
          return (
            <div key={m.label} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-text-muted uppercase">{m.label}</span>
                <span className={`text-[10px] ${isOver ? 'text-red-soft' : 'text-text-muted'}`}>{Math.round(pct)}%</span>
              </div>
              <p className={`text-2xl font-bold ${m.textColor}`}>{m.value}</p>
              <p className="text-[10px] text-text-muted">/ {m.goal} {m.unit}</p>
              <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden mt-2">
                <div className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-red-soft' : m.color}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[9px] text-text-muted mt-1">{m.goal - m.value > 0 ? `${m.goal - m.value} ${m.unit} left` : 'Goal reached!'}</p>
            </div>
          )
        })}
      </div>

      {/* Add Meal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
            <div className="card border-accent/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Log Meal</h3>
                <button onClick={() => setShowAdd(false)} className="text-text-muted hover:text-text-primary"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex gap-2 mb-3">
                {MEAL_TYPES.map(t => (
                  <button key={t.value} onClick={() => setMealType(t.value as typeof mealType)}
                    className={`flex-1 py-2 rounded-lg text-xs transition-all ${
                      mealType === t.value ? 'bg-accent/20 text-accent font-medium' : 'bg-bg-elevated text-text-muted hover:bg-bg-hover'
                    }`}><t.icon size={14} className="inline-block mr-1" />{t.label}</button>
                ))}
              </div>
              <input type="text" value={mealName} onChange={(e) => setMealName(e.target.value)} placeholder="Meal name" className="input w-full mb-3" />
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div><label className="text-[10px] text-text-muted uppercase block mb-1">Calories</label>
                  <input type="number" value={calories || ''} onChange={(e) => setCalories(Number(e.target.value))} className="input text-xs" /></div>
                <div><label className="text-[10px] text-text-muted uppercase block mb-1">Protein (g)</label>
                  <input type="number" value={protein || ''} onChange={(e) => setProtein(Number(e.target.value))} className="input text-xs" /></div>
                <div><label className="text-[10px] text-text-muted uppercase block mb-1">Carbs (g)</label>
                  <input type="number" value={carbs || ''} onChange={(e) => setCarbs(Number(e.target.value))} className="input text-xs" /></div>
                <div><label className="text-[10px] text-text-muted uppercase block mb-1">Fat (g)</label>
                  <input type="number" value={fat || ''} onChange={(e) => setFat(Number(e.target.value))} className="input text-xs" /></div>
              </div>
              <button onClick={handleAdd} className="btn w-full">Save Meal</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meals List */}
      {isLoading ? (
        <div className="text-center py-12"><p className="text-sm text-text-muted animate-pulse">Loading meals...</p></div>
      ) : meals.length === 0 ? (
        <div className="text-center py-16 card"><p className="text-sm text-text-muted">No meals logged {selectedDate === today ? 'today' : 'this day'}</p></div>
      ) : (
        <div className="space-y-4">
          {MEAL_TYPES.map(type => {
            const typeMeals = mealsByType[type.value]
            if (!typeMeals || typeMeals.length === 0) return null
            const typeCalories = typeMeals.reduce((s, m) => s + m.calories, 0)
            return (
              <div key={type.value}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-text-muted flex items-center gap-1.5"><type.icon size={14} /> {type.label}</h3>
                  <span className="text-[10px] text-text-muted">{typeCalories} kcal</span>
                </div>
                <div className="space-y-1.5">
                  {typeMeals.map(meal => (
                    <div key={meal._id} className="card group flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">{meal.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px]">
                          <span className="text-accent">{meal.calories} kcal</span>
                          <span className="text-green-soft">P: {meal.protein}g</span>
                          <span className="text-blue-soft">C: {meal.carbs}g</span>
                          <span className="text-orange-soft">F: {meal.fat}g</span>
                        </div>
                      </div>
                      <button onClick={() => repeatMeal(meal)} className="text-text-muted hover:text-accent transition-all opacity-0 group-hover:opacity-100" title="Repeat">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteMeal(meal._id)} className="text-text-muted hover:text-red-soft transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Daily Summary */}
      {meals.length > 0 && (
        <div className="card mt-6">
          <h3 className="text-xs font-medium text-text-muted mb-3">Daily Summary</h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div><p className="text-lg font-bold text-accent">{totals.calories}</p><p className="text-[10px] text-text-muted">kcal</p></div>
            <div><p className="text-lg font-bold text-green-soft">{totals.protein}g</p><p className="text-[10px] text-text-muted">protein</p></div>
            <div><p className="text-lg font-bold text-blue-soft">{totals.carbs}g</p><p className="text-[10px] text-text-muted">carbs</p></div>
            <div><p className="text-lg font-bold text-orange-soft">{totals.fat}g</p><p className="text-[10px] text-text-muted">fat</p></div>
          </div>
          <p className="text-[10px] text-text-muted mt-3 pt-3 border-t border-border text-center">{meals.length} meal{meals.length !== 1 ? 's' : ''} · {Math.round(totals.protein * 4 + totals.carbs * 4 + totals.fat * 9)} est. calories from macros</p>
        </div>
      )}
    </div>
  )
}
