const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function todayISO(): string {
  return toISO(new Date())
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function monthKey(s: string): string {
  return s.slice(0, 7)
}

export function addMonths(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1, 12)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function daysInMonth(key: string): string[] {
  const [y, m] = key.split('-').map(Number)
  const n = new Date(y, m, 0).getDate()
  return Array.from({ length: n }, (_, i) => `${key}-${pad(i + 1)}`)
}

/** Пн = 0 … Вс = 6 */
export function weekdayMon(s: string): number {
  return (parseISO(s).getDay() + 6) % 7
}

export function weekStart(s: string): string {
  return addDays(s, -weekdayMon(s))
}

export function weekDays(s: string): string[] {
  const start = weekStart(s)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function dayNumber(s: string): number {
  return Number(s.slice(8, 10))
}

export function weekdayShort(s: string): string {
  return WEEKDAYS[parseISO(s).getDay()]
}

export function monthTitle(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTHS_NOM[m - 1]} ${y}`
}

export function longDate(s: string): string {
  const d = parseISO(s)
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  const today = todayISO()
  if (s === today) return `Сегодня, ${base}`
  if (s === addDays(today, -1)) return `Вчера, ${base}`
  return `${WEEKDAYS[d.getDay()]}, ${base}`
}

export function shortDate(s: string): string {
  const d = parseISO(s)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}
