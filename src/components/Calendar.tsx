import { dayNumber, daysInMonth, todayISO, weekdayMon } from '../lib/dates'
import type { DayTone } from '../lib/stats'

const HEAD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export interface CalendarDay {
  tone: DayTone
  sport: boolean
}

export function Calendar({ month, days, onPick }: { month: string; days: Record<string, CalendarDay>; onPick: (date: string) => void }) {
  const list = daysInMonth(month)
  const blanks = weekdayMon(list[0])
  const today = todayISO()
  return (
    <div className="cal">
      {HEAD.map((h) => (
        <div key={h} className="cal-h">
          {h}
        </div>
      ))}
      {Array.from({ length: blanks }, (_, i) => (
        <div key={`b${i}`} />
      ))}
      {list.map((date) => {
        const d = days[date] ?? { tone: 'none', sport: false }
        return (
          <button key={date} className={`cal-d tone-${d.tone}${date === today ? ' today' : ''}`} onClick={() => onPick(date)} aria-label={date}>
            <span>{dayNumber(date)}</span>
            {d.sport ? <i className="cal-sport" /> : null}
          </button>
        )
      })}
    </div>
  )
}
