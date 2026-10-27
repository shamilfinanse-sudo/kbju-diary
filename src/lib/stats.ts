import { monthKey, weekStart } from './dates'
import { addTotals, sumEntries, sumWorkouts, ZERO } from './nutrition'
import type { AppData, FoodEntry, Targets, Totals, WorkoutEntry } from './types'

export interface DaySummary {
  date: string
  totals: Totals
  sportKcal: number
  sportMinutes: number
  hasFood: boolean
  hasSport: boolean
}

function summarize(date: string, foods: FoodEntry[], ws: WorkoutEntry[]): DaySummary {
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

export function daySummary(d: Pick<AppData, 'entries' | 'workouts'>, date: string): DaySummary {
  return summarize(
    date,
    d.entries.filter((e) => e.date === date),
    d.workouts.filter((w) => w.date === date),
  )
}

function groupByDate<T extends { date: string }>(list: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of list) map.set(item.date, [...(map.get(item.date) ?? []), item])
  return map
}

export function rangeSummary(d: Pick<AppData, 'entries' | 'workouts'>, dates: string[]): DaySummary[] {
  const foods = groupByDate(d.entries)
  const ws = groupByDate(d.workouts)
  return dates.map((date) => summarize(date, foods.get(date) ?? [], ws.get(date) ?? []))
}

export type BucketSize = 'day' | 'week' | 'month'

export interface Bucket {
  key: string
  start: string
  end: string
  logged: number
  avg: Totals
  sportKcal: number
  sportMinutes: number
}

const DAY_BUCKET_MAX_DAYS = 31
const WEEK_BUCKET_MAX_DAYS = 190

export function bucketSizeFor(dayCount: number): BucketSize {
  if (dayCount <= DAY_BUCKET_MAX_DAYS) return 'day'
  return dayCount <= WEEK_BUCKET_MAX_DAYS ? 'week' : 'month'
}

/** Склеивает дни в недели или месяцы: еда считается средним за день с записями, спорт суммой. */
export function bucketize(days: DaySummary[], size: BucketSize): Bucket[] {
  const keyOf = (date: string) => (size === 'day' ? date : size === 'week' ? weekStart(date) : monthKey(date))
  const groups = new Map<string, DaySummary[]>()
  for (const day of days) {
    const k = keyOf(day.date)
    groups.set(k, [...(groups.get(k) ?? []), day])
  }
  return [...groups.entries()].map(([key, list]) => {
    const logged = list.filter((x) => x.hasFood)
    const sum = logged.reduce((a, x) => addTotals(a, x.totals), ZERO)
    const n = logged.length || 1
    return {
      key,
      start: list[0].date,
      end: list[list.length - 1].date,
      logged: logged.length,
      avg: { kcal: sum.kcal / n, p: sum.p / n, f: sum.f / n, c: sum.c / n },
      sportKcal: list.reduce((a, x) => a + x.sportKcal, 0),
      sportMinutes: list.reduce((a, x) => a + x.sportMinutes, 0),
    }
  })
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
