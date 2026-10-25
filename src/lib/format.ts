export const fmt = (n: number): string => (Math.round(n) + 0).toLocaleString('ru-RU')

export const fmt1 = (n: number): string => ((Math.round(n * 10) / 10) + 0).toLocaleString('ru-RU')

export function minutesText(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m} мин`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} ч ${r} мин` : `${h} ч`
}
