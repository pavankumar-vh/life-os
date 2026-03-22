'use client'

import { useEffect, useState } from 'react'
import { useMealsStore, type MealData } from '@/store'
import { toISODate, formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Apple, Plus, Trash2, X, Repeat } from 'lucide-react'

const MEAL_TYPES: MealData['type'][] = ['breakfast', 'lunch', 'dinner', 'snack']
const MEAL_EMOJIS: Record<string, string> = {
  breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿'
}

export function DietView() {
  const { meals, isLoading, fetchMeals, addMeal, deleteMeal } = useMealsStore()
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<MealData['type']>('lunch')
  const [calories, setCalories] = useState(0)
  const [protein, setProtein] = useState(0)
  const [carbs, setCarbs] = useState(0)
  const [fat, setFat] = useState(0)
  const today = toISODate()

  useEffect(() => { fetchMeals(today).catch(() => {}) }, [fetchMeals, today])

  const handleAdd = async () => {
    if (!name.trim()) return
    await addMeal({ date: today, name, type, calories, protein, carbs, fat })
    setName(''); setCalories(0); setProtein(0); setCarbs(0); setFat(0)
    setShowAdd(false)
  }

  const repeatMeal = (meal: MealData) => {
    setName(meal.name)
    setType(meal.type)
    setCalories(meal.calories)
    setProtein(meal.protein)
    setCarbs(meal.carbs)
    setFat(meal.fat)
    setShowAdd(true)
  }

  const todayMeals = meals.filter((m) => m.date === today)
  const totals = todayMeals.reduce((acc, m) => ({
    calories: acc.calories + m.calories,
    protein: acc.protein + m.protein,
    carbs: acc.carbs + m.carbs,
    fat: acc.fat + m.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight flex items-center gap-2">
            <Apple className="w-6 h-6 text-brutal-yellow" />
            Diet
          </h1>
          <p className="text-text-muted font-mono text-sm mt-1">{formatDate(today)}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="brutal-btn flex items-center gap-2">
          <Plus className="w-4 h-4" /> Log Meal
        </button>
      </div>

      {/* Macro Summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Calories', value: totals.calories, unit: 'kcal', color: 'brutal-yellow', border: 'border-brutal-yellow', shadow: 'shadow-brutal' },
          { label: 'Protein', value: totals.protein, unit: 'g', color: 'brutal-green', border: 'border-brutal-green', shadow: 'shadow-brutal-green' },
          { label: 'Carbs', value: totals.carbs, unit: 'g', color: 'brutal-blue', border: 'border-brutal-blue', shadow: 'shadow-brutal-blue' },
          { label: 'Fat', value: totals.fat, unit: 'g', color: 'brutal-orange', border: 'border-[#F97316]', shadow: 'shadow-[4px_4px_0px_0px_#F97316]' },
        ].map((macro) => (
          <div key={macro.label} className={`border-3 ${macro.border} bg-bg-surface p-3 ${macro.shadow} text-center`}>
            <p className={`font-display text-2xl font-bold text-${macro.color}`}>{macro.value}</p>
            <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest">{macro.unit}</p>
            <p className="font-mono text-[10px] text-text-muted">{macro.label}</p>
          </div>
        ))}
      </div>

      {/* Add Meal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="border-3 border-brutal-yellow bg-bg-surface p-4 shadow-brutal">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider">Log Meal</h3>
                <button onClick={() => setShowAdd(false)}>
                  <X className="w-4 h-4 text-text-muted hover:text-text-primary" />
                </button>
              </div>

              {/* Meal Type */}
              <div className="flex gap-2 mb-3">
                {MEAL_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`flex-1 py-2 border-2 font-mono text-xs uppercase transition-all ${
                      type === t
                        ? 'border-brutal-yellow bg-brutal-yellow/10 text-brutal-yellow'
                        : 'border-border text-text-muted hover:border-text-muted'
                    }`}
                  >
                    {MEAL_EMOJIS[t]} {t}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Meal name..."
                className="brutal-input w-full mb-3"
                autoFocus
              />

              <div className="grid grid-cols-4 gap-2 mb-4">
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1">Calories</label>
                  <input type="number" value={calories || ''} onChange={(e) => setCalories(Number(e.target.value))} className="brutal-input w-full text-xs" />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1">Protein (g)</label>
                  <input type="number" value={protein || ''} onChange={(e) => setProtein(Number(e.target.value))} className="brutal-input w-full text-xs" />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1">Carbs (g)</label>
                  <input type="number" value={carbs || ''} onChange={(e) => setCarbs(Number(e.target.value))} className="brutal-input w-full text-xs" />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1">Fat (g)</label>
                  <input type="number" value={fat || ''} onChange={(e) => setFat(Number(e.target.value))} className="brutal-input w-full text-xs" />
                </div>
              </div>

              <button onClick={handleAdd} className="brutal-btn w-full">Save Meal</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meals by Type */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="font-mono text-sm text-text-muted animate-pulse">Loading meals...</p>
        </div>
      ) : todayMeals.length === 0 && !showAdd ? (
        <div className="text-center py-16 border-3 border-dashed border-border">
          <Apple className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="font-mono text-sm text-text-muted">No meals logged today</p>
        </div>
      ) : (
        <div className="space-y-4">
          {MEAL_TYPES.map((mealType) => {
            const typeMeals = todayMeals.filter((m) => m.type === mealType)
            if (typeMeals.length === 0) return null
            return (
              <div key={mealType}>
                <h3 className="font-mono text-xs uppercase tracking-widest text-text-muted mb-2 flex items-center gap-2">
                  <span>{MEAL_EMOJIS[mealType]}</span> {mealType}
                </h3>
                <div className="space-y-1">
                  {typeMeals.map((meal) => (
                    <div key={meal._id} className="border-3 border-border bg-bg-surface p-3 flex items-center gap-3 group hover:border-border-strong transition-colors">
                      <div className="flex-1">
                        <p className="font-mono text-sm font-bold">{meal.name}</p>
                        <div className="flex gap-3 mt-1">
                          <span className="font-mono text-[10px] text-brutal-yellow">{meal.calories} kcal</span>
                          <span className="font-mono text-[10px] text-brutal-green">P: {meal.protein}g</span>
                          <span className="font-mono text-[10px] text-brutal-blue">C: {meal.carbs}g</span>
                          <span className="font-mono text-[10px] text-brutal-orange">F: {meal.fat}g</span>
                        </div>
                      </div>
                      <button onClick={() => repeatMeal(meal)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-brutal-yellow transition-all" title="Repeat meal">
                        <Repeat className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteMeal(meal._id)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-brutal-red transition-all">
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
    </div>
  )
}
