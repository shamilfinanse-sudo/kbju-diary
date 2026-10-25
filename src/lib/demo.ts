import { addDays, todayISO } from './dates'
import { addFood, addWorkout, createInitial, newId, saveProducts } from './data'
import { calcTargets } from './norms'
import { localDrafts } from './resolve'
import type { AppData, FoodEntry, MealId, Profile } from './types'

const DEMO_DAYS = 45

const MEALS: Array<[MealId, string[]]> = [
  ['breakfast', ['овсянка на молоке 250 г, банан 1 шт', 'творог 5% 200 г, мёд 1 ст.л., яблоко 1 шт', 'яичница 3 яйца, хлеб чёрный 2 куска, кофе с молоком 200 мл']],
  ['lunch', ['гречка 200 г, куриная грудка 180 г, огурец 1 шт', 'рис 220 г, лосось 150 г, брокколи 150 г', 'борщ 350 г, хлеб чёрный 2 куска, сметана 15% 20 г', 'макароны 250 г, фарш говяжий 120 г, помидор 1 шт']],
  ['dinner', ['творог 5% 200 г, кефир 1% 250 мл', 'индейка грудка 200 г, салат листовой 100 г, масло оливковое 1 ст.л.', 'омлет 200 г, помидор 1 шт, хлеб белый 2 куска']],
  ['snack', ['миндаль 30 г, яблоко 1 шт', 'йогурт греческий 150 г', 'протеин сывороточный 1 шт, молоко 2.5% 250 мл', 'шоколад тёмный 30 г']],
]

const SPORT: Array<[string, number, number]> = [['Бег', 40, 9.8], ['Силовая тренировка', 60, 5], ['Ходьба', 50, 3.5], ['Велосипед', 45, 7.5], ['Плавание', 40, 7]]

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(Math.floor(seed)) % arr.length]
}

// Порции от 0,95 до 1,45 от записанных: в примере встречаются дни и в норме, и с перебором.
function portionFactor(back: number): number {
  return 0.95 + ((back * 7) % 11) / 22
}

export const DEMO_PROFILE: Profile = { sex: 'm', age: 32, heightCm: 180, weightKg: 82, activity: 1.375, goal: 'lose' }

export function demoData(): AppData {
  let data: AppData = { ...createInitial(), profile: DEMO_PROFILE, targets: calcTargets(DEMO_PROFILE) }
  const today = todayISO()
  for (let back = DEMO_DAYS; back >= 0; back--) {
    const date = addDays(today, -back)
    if (back % 11 === 7) continue
    const foods: FoodEntry[] = MEALS.flatMap(([meal, variants], mi) => {
      if (meal === 'snack' && (back + mi) % 3 === 0) return []
      const text = pick(variants, back * 3 + mi * 7)
      return localDrafts(text, {}).flatMap((d) =>
        d.per100 ? [{ id: newId(), date, meal, name: d.name, grams: Math.round(d.grams * portionFactor(back)), per100: d.per100, source: 'base' as const }] : [],
      )
    })
    data = addFood(data, foods)
    if (back % 2 === 0 || back % 5 === 0) {
      const [name, minutes, met] = pick(SPORT, back)
      data = addWorkout(data, { id: newId(), date, name, minutes, kcal: Math.round((met * DEMO_PROFILE.weightKg * minutes) / 60) })
    }
  }
  return saveProducts(data, [])
}
