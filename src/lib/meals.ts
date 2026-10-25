import type { MealId } from './types'

export const MEALS: Array<{ id: MealId; label: string }> = [
  { id: 'breakfast', label: 'Завтрак' },
  { id: 'lunch', label: 'Обед' },
  { id: 'dinner', label: 'Ужин' },
  { id: 'snack', label: 'Перекус' },
]

const LUNCH_FROM = 11
const DINNER_FROM = 16
const SNACK_FROM = 21

export function mealByTime(hour: number): MealId {
  if (hour < LUNCH_FROM) return 'breakfast'
  if (hour < DINNER_FROM) return 'lunch'
  if (hour < SNACK_FROM) return 'dinner'
  return 'snack'
}
