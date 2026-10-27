export const fmt = (n: number): string => (Math.round(n) + 0).toLocaleString('ru-RU')

export const fmt1 = (n: number): string => ((Math.round(n * 10) / 10) + 0).toLocaleString('ru-RU')

export function minutesText(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m} мин`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} ч ${r} мин` : `${h} ч`
}

export function daysWord(n: number): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'день'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'дня'
  return 'дней'
}
