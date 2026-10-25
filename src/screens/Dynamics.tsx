import { useMemo, useState } from 'react'
import { Bars, type Bar } from '../components/Charts'
import { Calendar, type CalendarDay } from '../components/Calendar'
import { IconLeft, IconRight } from '../components/Icons'
import { addDays, addMonths, dayNumber, daysInMonth, monthKey, monthTitle, shortDate, todayISO, weekDays, weekStart, weekdayShort } from '../lib/dates'
import { fmt, fmt1, minutesText } from '../lib/format'
import { FALLBACK_TARGETS } from '../lib/norms'
import { dayTone, periodStats, rangeSummary } from '../lib/stats'
import { useStore } from '../store'

type Mode = 'week' | 'month'

const KCAL_PER_G = { p: 4, f: 9, c: 4 }

export function Dynamics({ openDay }: { openDay: (date: string) => void }) {
  const { data } = useStore()
  const targets = data.targets ?? FALLBACK_TARGETS
  const [mode, setMode] = useState<Mode>('week')
  const [anchor, setAnchor] = useState(todayISO())

  const dates = useMemo(() => (mode === 'week' ? weekDays(anchor) : daysInMonth(monthKey(anchor))), [mode, anchor])
  const days = useMemo(() => rangeSummary(data, dates), [data, dates])
  const workoutsCount = data.workouts.filter((w) => dates.includes(w.date)).length
  const stats = useMemo(() => periodStats(days, targets, workoutsCount), [days, targets, workoutsCount])
  const today = todayISO()
  const labelEvery = mode === 'week' ? 1 : 5

  const label = (date: string) => (mode === 'week' ? weekdayShort(date) : String(dayNumber(date)))
  const kcalBars: Bar[] = days.map((d) => ({
    label: label(d.date),
    segments: [{ value: d.totals.kcal, color: 'var(--accent)' }],
    caption: `${shortDate(d.date)} · ${fmt(d.totals.kcal)} ккал${d.sportKcal ? ` · спорт −${fmt(d.sportKcal)}` : ''}`,
  }))
  const macroBars: Bar[] = days.map((d) => ({
    label: label(d.date),
    segments: [
      { value: d.totals.p * KCAL_PER_G.p, color: 'var(--c-p)' },
      { value: d.totals.f * KCAL_PER_G.f, color: 'var(--c-f)' },
      { value: d.totals.c * KCAL_PER_G.c, color: 'var(--c-c)' },
    ],
    caption: `${shortDate(d.date)} · Б ${fmt(d.totals.p)} · Ж ${fmt(d.totals.f)} · У ${fmt(d.totals.c)} г`,
  }))
  const sportBars: Bar[] = days.map((d) => ({
    label: label(d.date),
    segments: [{ value: d.sportMinutes, color: 'var(--c-p)' }],
    caption: `${shortDate(d.date)} · ${d.sportMinutes ? `${minutesText(d.sportMinutes)} · ${fmt(d.sportKcal)} ккал` : 'без тренировок'}`,
  }))

  const calendar: Record<string, CalendarDay> = {}
  for (const d of days) calendar[d.date] = { tone: dayTone(d, targets), sport: d.hasSport }

  const step = (n: number) => setAnchor(mode === 'week' ? addDays(anchor, n * 7) : `${addMonths(monthKey(anchor), n)}-01`)
  const title = mode === 'week' ? `${shortDate(weekStart(anchor))} – ${shortDate(addDays(weekStart(anchor), 6))}` : monthTitle(monthKey(anchor))
  const atEnd = dates[dates.length - 1] >= today
  const logged = [...days].reverse().filter((d) => d.hasFood || d.hasSport)

  return (
    <div className="screen">
      <div className="seg">
        <button className={mode === 'week' ? 'on' : ''} onClick={() => setMode('week')}>
          Неделя
        </button>
        <button className={mode === 'month' ? 'on' : ''} onClick={() => setMode('month')}>
          Месяц
        </button>
      </div>
      <div className="datebar">
        <button className="icon-btn round" onClick={() => step(-1)} aria-label="Назад">
          <IconLeft />
        </button>
        <div className="datelabel static">{title}</div>
        <button className="icon-btn round" onClick={() => step(1)} disabled={atEnd} aria-label="Вперёд">
          <IconRight />
        </button>
      </div>

      <div className="stats">
        <div className="card stat">
          <span>В среднем в день</span>
          <b>{fmt(stats.avg.kcal)} ккал</b>
          <small>норма {fmt(targets.kcal)}</small>
        </div>
        <div className="card stat">
          <span>Дней в норме</span>
          <b>
            {stats.daysInNorm} из {stats.daysLogged}
          </b>
          <small>±10% от нормы</small>
        </div>
        <div className="card stat">
          <span>Спорт</span>
          <b>{stats.sportMinutes ? minutesText(stats.sportMinutes) : '—'}</b>
          <small>
            {stats.workouts} трен. · {fmt(stats.sportKcal)} ккал
          </small>
        </div>
        <div className="card stat">
          <span>Б / Ж / У в среднем</span>
          <b>
            {fmt(stats.avg.p)} / {fmt(stats.avg.f)} / {fmt(stats.avg.c)}
          </b>
          <small>
            норма {targets.p} / {targets.f} / {targets.c}
          </small>
        </div>
      </div>

      {mode === 'month' ? (
        <section className="card">
          <h3>Календарь месяца</h3>
          <Calendar month={monthKey(anchor)} days={calendar} onPick={openDay} />
          <div className="legend">
            <span><i className="dot tone-under" /> меньше нормы</span>
            <span><i className="dot tone-good" /> в норме</span>
            <span><i className="dot tone-over" /> больше</span>
            <span><i className="cal-sport static" /> спорт</span>
          </div>
        </section>
      ) : null}

      <section className="card">
        <h3>Калории</h3>
        <Bars bars={kcalBars} target={targets.kcal} labelEvery={labelEvery} />
      </section>
      <section className="card">
        <h3>Белки, жиры, углеводы</h3>
        <Bars bars={macroBars} labelEvery={labelEvery} />
        <div className="legend">
          <span><i className="dot" style={{ background: 'var(--c-p)' }} /> белки</span>
          <span><i className="dot" style={{ background: 'var(--c-f)' }} /> жиры</span>
          <span><i className="dot" style={{ background: 'var(--c-c)' }} /> углеводы</span>
          <span className="muted">доли калорий</span>
        </div>
      </section>
      <section className="card">
        <h3>Спорт, минуты</h3>
        <Bars bars={sportBars} labelEvery={labelEvery} />
      </section>

      <section className="card">
        <h3>По дням</h3>
        {logged.length === 0 ? <div className="empty">За этот период записей нет</div> : null}
        {logged.map((d) => (
          <button key={d.date} className="row" onClick={() => openDay(d.date)}>
            <div>
              <b>
                {shortDate(d.date)}, {weekdayShort(d.date)}
              </b>
              <small>
                Б {fmt(d.totals.p)} · Ж {fmt(d.totals.f)} · У {fmt(d.totals.c)}
                {d.sportMinutes ? ` · спорт ${fmt1(d.sportMinutes)} мин` : ''}
              </small>
            </div>
            <span>{fmt(d.totals.kcal)}</span>
          </button>
        ))}
      </section>
    </div>
  )
}
