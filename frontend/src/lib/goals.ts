export const DEFAULT_GOALS = { calories: 2200, protein: 150, carbs: 250, fat: 70, water: 8, sleep: 8, steps: 10000, workoutsPerWeek: 4 }

/** @deprecated Use useSettingsStore(s => s.goals) instead */
export function getStoredGoals(): typeof DEFAULT_GOALS {
  return DEFAULT_GOALS
}
