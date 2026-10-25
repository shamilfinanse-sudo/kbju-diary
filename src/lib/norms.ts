import type { Goal, Profile, Targets } from './types'

export const ACTIVITY_LEVELS: Array<{ value: number; label: string; hint: string }> = [
  { value: 1.2, label: 'Сидячая', hint: 'почти нет движения' },
  { value: 1.375, label: 'Лёгкая', hint: 'прогулки, 1–3 тренировки в неделю' },
  { value: 1.55, label: 'Средняя', hint: '3–5 тренировок в неделю' },
  { value: 1.725, label: 'Высокая', hint: 'тренировки почти каждый день' },
]

export const GOALS: Array<{ value: Goal; label: string }> = [
  { value: 'lose', label: 'Похудеть' },
  { value: 'keep', label: 'Держать вес' },
  { value: 'gain', label: 'Набрать' },
]

const GOAL_FACTOR: Record<Goal, number> = { lose: 0.85, keep: 1, gain: 1.1 }
const PROTEIN_PER_KG: Record<Goal, number> = { lose: 2, keep: 1.6, gain: 1.8 }
const FAT_PER_KG = 0.9
const MIN_CARBS_G = 50

export function bmr(p: Profile): number {
  return 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'm' ? 5 : -161)
}

export function calcTargets(p: Profile): Targets {
  const kcal = Math.round((bmr(p) * p.activity * GOAL_FACTOR[p.goal]) / 10) * 10
  const prot = Math.round(p.weightKg * PROTEIN_PER_KG[p.goal])
  const fat = Math.round(p.weightKg * FAT_PER_KG)
  const carbs = Math.max(MIN_CARBS_G, Math.round((kcal - prot * 4 - fat * 9) / 4))
  return { kcal, p: prot, f: fat, c: carbs }
}

export const FALLBACK_TARGETS: Targets = { kcal: 2000, p: 100, f: 70, c: 230 }
