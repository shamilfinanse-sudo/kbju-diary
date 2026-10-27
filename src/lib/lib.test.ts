import { describe, expect, test } from 'vitest'
import { validateFoods } from './claude'
import { addFood, createInitial, parseBackup, removeFood, saveProducts, updateFood } from './data'
import { addDays, dateRange, daysInMonth, rangeTitle, weekStart } from './dates'
import { findFood } from './match'
import { dayGoals, goalStats, metricStatus } from './goals'
import { calcTargets } from './norms'
import { scale, sumEntries } from './nutrition'
import { parseChunk, resolveGrams, splitChunks } from './parse'
import { localDrafts } from './resolve'
import { bucketize, bucketSizeFor, dayTone, daySummary, periodStats, rangeSummary } from './stats'
import { parseWorkout, workoutKcal } from './workouts'
import type { FoodEntry } from './types'

const entry = (over: Partial<FoodEntry> = {}): FoodEntry => ({
  id: 'e1', date: '2026-10-25', meal: 'lunch', name: 'Гречка', grams: 200,
  per100: { kcal: 110, p: 4, f: 1, c: 21 }, source: 'base', ...over,
})

describe('splitChunks / parseChunk', () => {
  test('splits by comma, plus and "и" but keeps decimals', () => {
    expect(splitChunks('гречка 150 г, курица 200 г + яйцо и хлеб')).toEqual(['гречка 150 г', 'курица 200 г', 'яйцо', 'хлеб'])
    expect(splitChunks('рис 1,5 кг')).toEqual(['рис 1,5 кг'])
  })
  test('reads grams before or after the name', () => {
    expect(parseChunk('гречка 150 г')).toMatchObject({ name: 'гречка', amount: 150, unit: 'g' })
    expect(parseChunk('150 г гречки')).toMatchObject({ name: 'гречки', amount: 150, unit: 'g' })
    expect(parseChunk('гречка 150г')).toMatchObject({ amount: 150, unit: 'g' })
  })
  test('reads pieces, spoons and fat percent', () => {
    expect(parseChunk('2 яйца')).toMatchObject({ name: 'яйца', amount: 2, unit: null })
    expect(parseChunk('масло 1 ст.л.')).toMatchObject({ amount: 1, unit: 'tbsp' })
    expect(parseChunk('ложка меда')).toMatchObject({ amount: 1, unit: 'tbsp', name: 'меда' })
    expect(parseChunk('сметана 20% 30 г')).toMatchObject({ name: 'сметана 20%', amount: 30, unit: 'g' })
  })
  test('item without amount is a guess', () => {
    expect(parseChunk('банан')).toMatchObject({ amount: null })
    expect(resolveGrams(parseChunk('банан'), { pieceG: 120 })).toEqual({ grams: 120, guessed: true })
  })
  test('converts units to grams', () => {
    expect(resolveGrams(parseChunk('молоко 1 л'), null).grams).toBe(1000)
    expect(resolveGrams(parseChunk('2 яйца'), { pieceG: 55 }).grams).toBe(110)
    expect(resolveGrams(parseChunk('масло 1 ст.л.'), { tbspG: 14 }).grams).toBe(14)
    expect(resolveGrams(parseChunk('гречка 150'), { pieceG: undefined }).grams).toBe(150)
  })
})

describe('findFood', () => {
  test('picks cooked buckwheat by default and dry on request', () => {
    expect(findFood('гречка', {})?.name).toBe('Гречка варёная')
    expect(findFood('гречки', {})?.name).toBe('Гречка варёная')
    expect(findFood('гречка сухая', {})?.name).toBe('Гречка сухая')
  })
  test('matches word forms', () => {
    expect(findFood('курица', {})?.name).toBe('Куриная грудка')
    expect(findFood('яйца', {})?.name).toBe('Яйцо куриное')
    expect(findFood('творог 9%', {})?.name).toBe('Творог 9%')
    expect(findFood('масла', {})?.name).toBe('Масло сливочное')
    expect(findFood('маслины', {})?.name).toBe('Оливки')
  })
  test('does not confuse unrelated words', () => {
    expect(findFood('сок', {})?.name).toContain('Сок')
    expect(findFood('суши', {})?.name).toBe('Суши роллы')
    expect(findFood('абракадабра', {})).toBeNull()
  })
  test('own products win over base', () => {
    const products = saveProducts(createInitial(), [{ name: 'Гречка моя', per100: { kcal: 99, p: 1, f: 1, c: 1 } }]).products
    expect(findFood('гречка', products)).toMatchObject({ source: 'own', per100: { kcal: 99 } })
  })
})

describe('localDrafts', () => {
  test('computes a typical meal', () => {
    const [a, b, c] = localDrafts('гречка 150 г, куриная грудка 200 г, абракадабра 50 г', {})
    expect(a).toMatchObject({ grams: 150, source: 'base' })
    expect(b.grams).toBe(200)
    expect(c).toMatchObject({ source: 'missing', per100: null })
  })
})

describe('nutrition and stats', () => {
  test('scales per100 to grams', () => {
    expect(scale({ kcal: 110, p: 4, f: 1, c: 21 }, 200)).toEqual({ kcal: 220, p: 8, f: 2, c: 42 })
    expect(sumEntries([entry(), entry({ id: 'e2', grams: 100 })]).kcal).toBe(330)
  })
  test('day summary, period stats and tone', () => {
    let d = createInitial()
    d = addFood(d, [entry(), entry({ id: 'e2', date: '2026-10-24', grams: 100 })])
    d = { ...d, workouts: [{ id: 'w', date: '2026-10-25', name: 'Бег', minutes: 30, kcal: 300 }] }
    const s = daySummary(d, '2026-10-25')
    expect(s).toMatchObject({ hasFood: true, sportKcal: 300, sportMinutes: 30 })
    const days = rangeSummary(d, ['2026-10-24', '2026-10-25', '2026-10-26'])
    const p = periodStats(days, { kcal: 200, p: 1, f: 1, c: 1 }, 1)
    expect(p.daysLogged).toBe(2)
    expect(p.avg.kcal).toBe(165)
    expect(p.sportKcal).toBe(300)
    expect(dayTone(days[2], { kcal: 200, p: 1, f: 1, c: 1 })).toBe('none')
    expect(dayTone(days[0], { kcal: 200, p: 1, f: 1, c: 1 })).toBe('under')
    expect(dayTone(days[1], { kcal: 100, p: 1, f: 1, c: 1 })).toBe('over')
  })
  test('immutable updates', () => {
    const d0 = addFood(createInitial(), [entry()])
    const d1 = updateFood(d0, 'e1', { grams: 50 })
    expect(d0.entries[0].grams).toBe(200)
    expect(d1.entries[0].grams).toBe(50)
    expect(removeFood(d1, 'e1').entries).toHaveLength(0)
  })
})

describe('norms', () => {
  test('Mifflin–St Jeor with goal', () => {
    const t = calcTargets({ sex: 'm', age: 32, heightCm: 180, weightKg: 82, activity: 1.375, goal: 'lose' })
    expect(t.kcal).toBeGreaterThan(1900)
    expect(t.kcal).toBeLessThan(2300)
    expect(t.p).toBe(164)
    expect(Math.abs(t.p * 4 + t.f * 9 + t.c * 4 - t.kcal)).toBeLessThan(10)
  })
})

describe('workouts', () => {
  test('parses name and minutes', () => {
    expect(parseWorkout('бег 40 минут')).toMatchObject({ name: 'Бег', minutes: 40 })
    expect(parseWorkout('силовая 1,5 часа')).toMatchObject({ name: 'Силовая тренировка', minutes: 90 })
    expect(parseWorkout('пробежал 5 км')).toMatchObject({ name: 'Бег', minutes: 30 })
    expect(parseWorkout('плавание')).toMatchObject({ minutes: 30, guessedMinutes: true })
    expect(parseWorkout('квиддич')).toBeNull()
  })
  test('MET formula', () => {
    expect(workoutKcal(9.8, 80, 30)).toBe(392)
  })
})

describe('dates, backup, claude validation', () => {
  test('date helpers', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(weekStart('2026-10-25')).toBe('2026-10-19')
    expect(daysInMonth('2026-02')).toHaveLength(28)
  })
  test('backup roundtrip and rejection', () => {
    const d = addFood(createInitial(), [entry()])
    expect(parseBackup(JSON.stringify(d)).entries).toHaveLength(1)
    expect(() => parseBackup('{"x":1}')).toThrow()
  })
  test('validateFoods drops broken rows', () => {
    const ok = { i: 0, name: 'Плов', grams: 300, kcal: 190, p: 8, f: 8, c: 21 }
    expect(validateFoods([ok, { ...ok, i: 1, kcal: 5000 }, { ...ok, i: 2, grams: -1 }, { i: 3 }])).toHaveLength(1)
    expect(validateFoods('nope')).toEqual([])
  })
})

describe('periods', () => {
  test('date range and title', () => {
    expect(dateRange('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
    expect(dateRange('2026-11-02', '2026-10-30')).toEqual([])
    expect(rangeTitle('2025-12-20', '2026-01-05')).toContain('2025')
    expect(rangeTitle('2026-10-01', '2026-10-25')).not.toContain('2026')
  })
  test('bucket size depends on period length', () => {
    expect(bucketSizeFor(7)).toBe('day')
    expect(bucketSizeFor(31)).toBe('day')
    expect(bucketSizeFor(90)).toBe('week')
    expect(bucketSizeFor(365)).toBe('month')
  })
  test('buckets average food per logged day and sum sport', () => {
    let d = createInitial()
    d = addFood(d, [entry({ id: 'a', date: '2026-10-19' }), entry({ id: 'b', date: '2026-10-20', grams: 100 })])
    d = { ...d, workouts: [{ id: 'w1', date: '2026-10-21', name: 'Бег', minutes: 30, kcal: 300 }, { id: 'w2', date: '2026-10-22', name: 'Бег', minutes: 20, kcal: 200 }] }
    const days = rangeSummary(d, dateRange('2026-10-19', '2026-10-28'))
    const weeks = bucketize(days, 'week')
    expect(weeks).toHaveLength(2)
    expect(weeks[0]).toMatchObject({ start: '2026-10-19', logged: 2, sportMinutes: 50, sportKcal: 500 })
    expect(weeks[0].avg.kcal).toBe(165)
    expect(weeks[1].logged).toBe(0)
    expect(bucketize(days, 'month')).toHaveLength(1)
  })
})

describe('goals', () => {
  const targets = { kcal: 2000, p: 100, f: 70, c: 250 }
  const day = (date: string, kcal: number, p: number, f: number, c: number, hasFood = true) => ({
    date, totals: { kcal, p, f, c }, sportKcal: 0, sportMinutes: 0, hasFood, hasSport: false,
  })
  test('status uses the 90–110% corridor, protein has no upper bound', () => {
    expect(metricStatus('kcal', 1700, 2000)).toBe('low')
    expect(metricStatus('kcal', 1800, 2000)).toBe('hit')
    expect(metricStatus('kcal', 2200, 2000)).toBe('hit')
    expect(metricStatus('kcal', 2300, 2000)).toBe('high')
    expect(metricStatus('p', 300, 100)).toBe('hit')
    expect(metricStatus('p', 80, 100)).toBe('low')
  })
  test('dayGoals reports each metric', () => {
    expect(dayGoals(day('2026-10-20', 2000, 50, 70, 300), targets)).toEqual({ kcal: 'hit', p: 'low', f: 'hit', c: 'high' })
  })
  test('stats skip today and days without food, and count streaks', () => {
    const ok = (d: string) => day(d, 2000, 100, 70, 250)
    const days = [ok('2026-10-20'), ok('2026-10-21'), day('2026-10-22', 1000, 40, 30, 100), ok('2026-10-23'), ok('2026-10-24'), ok('2026-10-25'), day('2026-10-26', 0, 0, 0, 0, false), ok('2026-10-27')]
    const g = goalStats(days, targets, '2026-10-27')
    expect(g.days).toBe(6)
    expect(g.full).toBe(5)
    expect(g.hit.kcal).toBe(5)
    expect(g.bestStreak).toBe(3)
    expect(g.currentStreak).toBe(0)
    expect(goalStats(days.slice(0, 2), targets, '2026-10-27')).toMatchObject({ full: 2, currentStreak: 2, bestStreak: 2 })
  })
})
