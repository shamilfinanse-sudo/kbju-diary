import { addTotals, sumEntries, sumWorkouts, ZERO } from './nutrition'
import type { AppData, Targets, Totals } from './types'

export interface DaySummary {
  date: string
  totals: Totals
  sportKcal: number
  sportMinutes: number
  hasFood: boolean
  hasSport: boolean
}

export function daySummary(d: Pick<AppData, 'entries' | 'workouts'>, date: string): DaySummary {
  const foods = d.entries.filter((e) => e.date === date)
  const ws = d.workouts.filter((w) => w.date === date)
  const sport = sumWorkouts(ws)
  return {
    date,
    totals: sumEntries(foods),
    sportKcal: sport.kcal,
    sportMinutes: sport.minutes,
    hasFood: foods.length > 0,
    hasSport: ws.length > 0,
  }
}

export function rangeSummary(d: Pick<AppData, 'entries' | 'workouts'>, dates: string[]): DaySummary[] {
  return dates.map((date) => daySummary(d, date))
}

export interface PeriodStats {
  daysLogged: number
  avg: Totals
  sportKcal: number
  sportMinutes: number
  workouts: number
  daysInNorm: number
}

const NORM_TOLERANCE = 0.1

export function periodStats(days: DaySummary[], targets: Targets, workoutCount: number): PeriodStats {
  const logged = days.filter((x) => x.hasFood)
  const sum = logged.reduce((a, x) => addTotals(a, x.totals), ZERO)
  const n = logged.length || 1
  return {
    daysLogged: logged.length,
    avg: { kcal: sum.kcal / n, p: sum.p / n, f: sum.f / n, c: sum.c / n },
    sportKcal: days.reduce((a, x) => a + x.sportKcal, 0),
    sportMinutes: days.reduce((a, x) => a + x.sportMinutes, 0),
    workouts: workoutCount,
    daysInNorm: logged.filter((x) => Math.abs(x.totals.kcal - targets.kcal) <= targets.kcal * NORM_TOLERANCE).length,
  }
}

export type DayTone = 'none' | 'under' | 'good' | 'over'

export function dayTone(s: DaySummary, targets: Targets): DayTone {
  if (!s.hasFood) return 'none'
  const r = s.totals.kcal / targets.kcal
  if (r < 1 - NORM_TOLERANCE) return 'under'
  if (r > 1 + NORM_TOLERANCE) return 'over'
  return 'good'
}
