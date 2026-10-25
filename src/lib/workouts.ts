import { queryTokens } from './match'
import { wordsMatch } from './foods'

interface Activity {
  name: string
  met: number
  words: string[]
  minPerKm?: number
}

const ROWS: Array<[string, number, string, number?]> = [
  ['Бег', 9.8, 'бег бегал бегала пробежка побегал', 6],
  ['Быстрая ходьба', 4.3, 'ходьба быстрая', 10],
  ['Ходьба', 3.5, 'ходьба шаг шагал прогулка гулял гуляла', 12],
  ['Скандинавская ходьба', 4.5, 'скандинавская палки'],
  ['Велосипед', 7.5, 'велосипед велик велопрогулка', 3],
  ['Велотренажёр', 6.8, 'велотренажер'],
  ['Плавание', 7, 'плавание бассейн плавал плавала'],
  ['Силовая тренировка', 5, 'силовая зал тренажёрный тренажерка железо штанга гантели'],
  ['Кардио', 6.5, 'кардио'],
  ['Интервальная тренировка', 8.5, 'интервальная hiit хит табата'],
  ['Кроссфит', 8, 'кроссфит турник'],
  ['Йога', 2.5, 'йога'],
  ['Пилатес', 3, 'пилатес'],
  ['Растяжка', 2.3, 'растяжка стретчинг зарядка'],
  ['Эллипс', 5, 'эллипс эллиптический'],
  ['Степпер', 6, 'степпер'],
  ['Скакалка', 11, 'скакалка'],
  ['Танцы', 5, 'танцы'],
  ['Бокс', 7.8, 'бокс'],
  ['Футбол', 7, 'футбол'],
  ['Баскетбол', 6.5, 'баскетбол'],
  ['Волейбол', 4, 'волейбол'],
  ['Теннис', 7, 'теннис'],
  ['Лыжи', 7, 'лыжи'],
  ['Гребля', 7, 'гребля'],
  ['Уборка', 3.3, 'уборка'],
]

export const ACTIVITIES: Activity[] = ROWS.map(([name, met, words, minPerKm]) => ({
  name,
  met,
  minPerKm,
  words: words.split(' '),
}))

export const QUICK_WORKOUTS = ['Бег', 'Ходьба', 'Силовая тренировка', 'Велосипед', 'Плавание', 'Йога']

const DEFAULT_MINUTES = 30

export interface WorkoutGuess {
  name: string
  minutes: number
  met: number
  guessedMinutes: boolean
}

export function parseWorkout(text: string): WorkoutGuess | null {
  const q = queryTokens(text.replace(/\d+(?:[.,]\d+)?/g, ' '))
  const act = ACTIVITIES.find((a) => q.length > 0 && q.some((t) => a.words.some((w) => wordsMatch(t, w))))
  if (!act) return null
  const norm = text.toLowerCase().replace(',', '.')
  const km = /(\d+(?:\.\d+)?)\s*км/.exec(norm)
  const hours = /(\d+(?:\.\d+)?)\s*(?:ч(?![\p{L}])|час\p{L}*)/u.exec(norm)
  const mins = /(\d+(?:\.\d+)?)\s*(?:мин\p{L}*|м(?![\p{L}]))/u.exec(norm)
  let minutes: number | null = null
  if (mins) minutes = Number(mins[1])
  if (hours) minutes = (minutes ?? 0) + Number(hours[1]) * 60
  if (minutes === null && km && act.minPerKm) minutes = Number(km[1]) * act.minPerKm
  if (minutes === null) {
    const bare = /(\d+(?:\.\d+)?)/.exec(norm)
    if (bare && Number(bare[1]) >= 5 && !km) minutes = Number(bare[1])
  }
  return {
    name: act.name,
    met: act.met,
    minutes: Math.round(minutes ?? DEFAULT_MINUTES),
    guessedMinutes: minutes === null,
  }
}

export function workoutKcal(met: number, weightKg: number, minutes: number): number {
  return Math.round((met * weightKg * minutes) / 60)
}
