import type { FoodEntry, Per100, Totals, WorkoutEntry } from './types'

export const ZERO: Totals = { kcal: 0, p: 0, f: 0, c: 0 }

export function scale(per100: Per100, grams: number): Totals {
  const k = grams / 100
  return { kcal: per100.kcal * k, p: per100.p * k, f: per100.f * k, c: per100.c * k }
}

export function addTotals(a: Totals, b: Totals): Totals {
  return { kcal: a.kcal + b.kcal, p: a.p + b.p, f: a.f + b.f, c: a.c + b.c }
}

export function entryTotals(e: Pick<FoodEntry, 'per100' | 'grams'>): Totals {
  return scale(e.per100, e.grams)
}

export function sumEntries(entries: Pick<FoodEntry, 'per100' | 'grams'>[]): Totals {
  return entries.reduce((acc, e) => addTotals(acc, entryTotals(e)), ZERO)
}

export function sumWorkouts(ws: Pick<WorkoutEntry, 'kcal' | 'minutes'>[]): { kcal: number; minutes: number } {
  return ws.reduce((a, w) => ({ kcal: a.kcal + w.kcal, minutes: a.minutes + w.minutes }), { kcal: 0, minutes: 0 })
}
