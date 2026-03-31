export const DEFAULT_GOALS = { calories: 2200, protein: 150, carbs: 250, fat: 70, water: 8, sleep: 8, steps: 10000, workoutsPerWeek: 4 }

export function getStoredGoals(): typeof DEFAULT_GOALS {
  if (typeof window === 'undefined') return DEFAULT_GOALS
  try {
    const stored = localStorage.getItem('lifeos-goals')
    return stored ? { ...DEFAULT_GOALS, ...JSON.parse(stored) } : DEFAULT_GOALS
  } catch { return DEFAULT_GOALS }
}
