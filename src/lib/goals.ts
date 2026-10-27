import { addDays } from './dates'
import type { DaySummary } from './stats'
import type { Targets } from './types'

export type GoalMetric = 'kcal' | 'p' | 'f' | 'c'
export type GoalStatus = 'low' | 'hit' | 'high'

/** Доля от нормы: ниже low — не добрал, выше high — перебор. У белка верхней границы нет. */
export const GOAL_RULES: Record<GoalMetric, { low: number; high: number | null; label: string }> = {
  kcal: { low: 0.9, high: 1.1, label: 'Калории' },
  p: { low: 0.9, high: null, label: 'Белки' },
  f: { low: 0.9, high: 1.1, label: 'Жиры' },
  c: { low: 0.9, high: 1.1, label: 'Углеводы' },
}

export const GOAL_METRICS: GoalMetric[] = ['kcal', 'p', 'f', 'c']

export function metricStatus(metric: GoalMetric, value: number, target: number): GoalStatus {
  if (target <= 0) return 'hit'
  const ratio = value / target
  const rule = GOAL_RULES[metric]
  if (ratio < rule.low) return 'low'
  if (rule.high !== null && ratio > rule.high) return 'high'
  return 'hit'
}

export function dayGoals(day: DaySummary, targets: Targets): Record<GoalMetric, GoalStatus> {
  return {
    kcal: metricStatus('kcal', day.totals.kcal, targets.kcal),
    p: metricStatus('p', day.totals.p, targets.p),
    f: metricStatus('f', day.totals.f, targets.f),
    c: metricStatus('c', day.totals.c, targets.c),
  }
}

export interface GoalStats {
  /** Завершённые дни с записями еды (сегодняшний день ещё идёт и не считается). */
  days: number
  hit: Record<GoalMetric, number>
  full: number
  currentStreak: number
  bestStreak: number
}

export function goalStats(days: DaySummary[], targets: Targets, today: string): GoalStats {
  const hit: Record<GoalMetric, number> = { kcal: 0, p: 0, f: 0, c: 0 }
  let counted = 0
  let full = 0
  let run = 0
  let best = 0
  let prevDate: string | null = null
  for (const day of days) {
    if (day.date >= today) continue
    const wasConsecutive = prevDate !== null && addDays(prevDate, 1) === day.date
    prevDate = day.date
    if (!day.hasFood) {
      run = 0
      continue
    }
    counted++
    const g = dayGoals(day, targets)
    for (const m of GOAL_METRICS) if (g[m] === 'hit') hit[m]++
    const allHit = GOAL_METRICS.every((m) => g[m] === 'hit')
    if (allHit) {
      full++
      run = wasConsecutive || run === 0 ? run + 1 : 1
      best = Math.max(best, run)
    } else {
      run = 0
    }
  }
  return { days: counted, hit, full, currentStreak: run, bestStreak: best }
}
