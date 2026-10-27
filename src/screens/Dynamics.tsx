import { useMemo, useState } from 'react'
import { Bars, type Bar } from '../components/Charts'
import { Calendar, type CalendarDay } from '../components/Calendar'
import { IconLeft, IconRight } from '../components/Icons'
import {
  addDays,
  addMonths,
  dateRange,
  dayNumber,
  daysBetween,
  daysInMonth,
  monthKey,
  monthShort,
  monthTitle,
  rangeTitle,
  shortDate,
  todayISO,
  weekDays,
  weekdayShort,
} from '../lib/dates'
import { daysWord, fmt, fmt1, minutesText } from '../lib/format'
import { GOAL_METRICS, GOAL_RULES, goalStats, periodPlan, type GoalMetric, type GoalStatus } from '../lib/goals'
import { FALLBACK_TARGETS } from '../lib/norms'
import { bucketize, bucketSizeFor, dayTone, periodStats, rangeSummary, type Bucket, type BucketSize } from '../lib/stats'
import { useStore } from '../store'

type Mode = 'week' | 'month' | 'quarter' | 'half' | 'year' | 'custom'

const MODES: Array<{ id: Mode; label: string; len?: number }> = [
  { id: 'week', label: 'Неделя' },
  { id: 'month', label: 'Месяц' },
  { id: 'quarter', label: '3 месяца', len: 90 },
  { id: 'half', label: 'Полгода', len: 182 },
  { id: 'year', label: 'Год', len: 365 },
  { id: 'custom', label: 'Свой период' },
]

const PLAN_TITLE: Record<Mode, string> = {
  week: 'План на неделю',
  month: 'План на месяц',
  quarter: 'План на 3 месяца',
  half: 'План на полгода',
  year: 'План на год',
  custom: 'План на период',
}
const UNIT: Record<GoalMetric, string> = { kcal: 'ккал', p: 'г', f: 'г', c: 'г' }
const STATUS_TEXT: Record<GoalStatus, string> = { low: 'не добрано', hit: 'в норме', high: 'выше нормы' }

const KCAL_PER_G = { p: 4, f: 9, c: 4 }
const MAX_CUSTOM_DAYS = 400
const DEFAULT_CUSTOM_DAYS = 30
const TARGET_LABELS = 7

function bucketTitle(b: Bucket, size: BucketSize): string {
  if (size === 'month') return monthTitle(b.key)
  if (size === 'week') return rangeTitle(b.start, b.end)
  return shortDate(b.start)
}

export function Dynamics({ openDay }: { openDay: (date: string) => void }) {
  const { data } = useStore()
  const targets = data.targets ?? FALLBACK_TARGETS
  const today = todayISO()
  const [mode, setMode] = useState<Mode>('week')
  const [anchor, setAnchor] = useState(today)
  const [custom, setCustom] = useState({ from: addDays(today, -(DEFAULT_CUSTOM_DAYS - 1)), to: today })

  const modeInfo = MODES.find((m) => m.id === mode)!
  const dates = useMemo(() => {
    if (mode === 'week') return weekDays(anchor)
    if (mode === 'month') return daysInMonth(monthKey(anchor))
    if (mode === 'custom') {
      const from = daysBetween(custom.from, custom.to) >= MAX_CUSTOM_DAYS ? addDays(custom.to, -(MAX_CUSTOM_DAYS - 1)) : custom.from
      return dateRange(from, custom.to)
    }
    return dateRange(addDays(anchor, -((modeInfo.len ?? 1) - 1)), anchor)
  }, [mode, anchor, custom, modeInfo.len])

  const days = useMemo(() => rangeSummary(data, dates), [data, dates])
  const size = bucketSizeFor(dates.length)
  const buckets = useMemo(() => bucketize(days, size), [days, size])
  const stats = useMemo(() => {
    const set = new Set(dates)
    return periodStats(days, targets, data.workouts.filter((w) => set.has(w.date)).length)
  }, [days, dates, targets, data.workouts])

  const plan = useMemo(() => periodPlan(days, targets, today), [days, targets, today])
  const goals = useMemo(() => goalStats(days, targets, today), [days, targets, today])
  const pct = (n: number) => (goals.days ? Math.round((n / goals.days) * 100) : 0)

  const labelEvery = Math.max(1, Math.ceil(buckets.length / TARGET_LABELS))
  const aggregated = size !== 'day'
  const barLabel = (b: Bucket) => {
    if (size === 'month') return monthShort(b.key)
    if (size === 'week') return shortDate(b.start)
    return mode === 'week' ? weekdayShort(b.start) : String(dayNumber(b.start))
  }
  const avgNote = aggregated ? 'в среднем за день' : ''

  const kcalBars: Bar[] = buckets.map((b) => ({
    label: barLabel(b),
    segments: [{ value: b.avg.kcal, color: 'var(--accent)' }],
    caption: `${bucketTitle(b, size)} · ${fmt(b.avg.kcal)} ккал ${avgNote}${!aggregated && b.sportKcal ? ` · спорт −${fmt(b.sportKcal)}` : ''}`.trim(),
  }))
  const macroBars: Bar[] = buckets.map((b) => ({
    label: barLabel(b),
    segments: [
      { value: b.avg.p * KCAL_PER_G.p, color: 'var(--c-p)' },
      { value: b.avg.f * KCAL_PER_G.f, color: 'var(--c-f)' },
      { value: b.avg.c * KCAL_PER_G.c, color: 'var(--c-c)' },
    ],
    caption: `${bucketTitle(b, size)} · Б ${fmt(b.avg.p)} · Ж ${fmt(b.avg.f)} · У ${fmt(b.avg.c)} г ${avgNote}`.trim(),
  }))
  const sportBars: Bar[] = buckets.map((b) => ({
    label: barLabel(b),
    segments: [{ value: b.sportMinutes, color: 'var(--c-p)' }],
    caption: `${bucketTitle(b, size)} · ${b.sportMinutes ? `${minutesText(b.sportMinutes)} · ${fmt(b.sportKcal)} ккал` : 'без тренировок'}`,
  }))

  const calendar: Record<string, CalendarDay> = {}
  for (const d of days) calendar[d.date] = { tone: dayTone(d, targets), sport: d.hasSport }

  const rolling = mode === 'quarter' || mode === 'half' || mode === 'year'
  const step = (n: number) => {
    if (mode === 'week') setAnchor(addDays(anchor, n * 7))
    else if (mode === 'month') setAnchor(`${addMonths(monthKey(anchor), n)}-01`)
    else if (rolling) {
      const next = addDays(anchor, n * (modeInfo.len ?? 1))
      setAnchor(next > today ? today : next)
    }
  }
  const title = mode === 'month' ? monthTitle(monthKey(anchor)) : rangeTitle(dates[0], dates[dates.length - 1])
  const atEnd = dates[dates.length - 1] >= today
  const logged = [...days].reverse().filter((d) => d.hasFood || d.hasSport)
  const sizeWord = size === 'month' ? 'месяцам' : 'неделям'

  const changeMode = (m: Mode) => {
    setMode(m)
    setAnchor(today)
  }

  return (
    <div className="screen">
      <div className="chips periods" role="tablist" aria-label="Период">
        {MODES.map((m) => (
          <button key={m.id} role="tab" aria-selected={mode === m.id} className={`chip${mode === m.id ? ' on' : ''}`} onClick={() => changeMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'custom' ? (
        <div className="card grid2">
          <label className="field">
            <span className="field-label">С</span>
            <input type="date" max={custom.to} value={custom.from} onChange={(e) => e.target.value && setCustom({ ...custom, from: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">По</span>
            <input
              type="date"
              min={custom.from}
              max={today}
              value={custom.to}
              onChange={(e) => e.target.value && setCustom({ ...custom, to: e.target.value })}
            />
          </label>
        </div>
      ) : (
        <div className="datebar">
          <button className="icon-btn round" onClick={() => step(-1)} aria-label="Назад">
            <IconLeft />
          </button>
          <div className="datelabel static">{title}</div>
          <button className="icon-btn round" onClick={() => step(1)} disabled={atEnd} aria-label="Вперёд">
            <IconRight />
          </button>
        </div>
      )}

      <section className="card stack">
        <h3>{PLAN_TITLE[mode]}</h3>
        <div className="hint">
          Норма на день × {plan.days} {daysWord(plan.days)}. {plan.finished ? 'Период закончился.' : 'Период ещё идёт, сегодняшний день учтён по тому, что уже записано.'}
        </div>
        <div className="goal-list">
          {plan.lines.map((l) => (
            <div key={l.metric} className="goal-row">
              <div className="goal-top">
                <span>{GOAL_RULES[l.metric].label}</span>
                <b>
                  {fmt(l.consumed)} из {fmt(l.plan)} {UNIT[l.metric]}
                </b>
              </div>
              <div className="track thin">
                <div className="fill" style={{ width: `${Math.min(l.ratio * 100, 100)}%`, background: l.metric === 'kcal' ? 'var(--accent)' : `var(--c-${l.metric})` }} />
              </div>
              <div className="goal-sub">
                <small>
                  {Math.round(l.ratio * 100)}% плана · {l.remaining >= 0 ? `осталось ${fmt(l.remaining)}` : `выше плана на ${fmt(-l.remaining)}`} {UNIT[l.metric]}
                </small>
                {l.status ? <em className={`goal ${l.status}`}>{l.status === 'hit' ? '✓ ' : ''}{STATUS_TEXT[l.status]}</em> : null}
              </div>
            </div>
          ))}
        </div>
        {plan.sportKcal ? <div className="hint">Спорт за период: {fmt(plan.sportKcal)} ккал, на столько можно съесть больше плана.</div> : null}
      </section>

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

      <section className="card stack">
        <h3>Выполнение плана по дням</h3>
        {goals.days === 0 ? (
          <div className="empty">Нет завершённых дней с записями. Сегодняшний день не считается, пока он не закончился.</div>
        ) : (
          <>
            <div className="goal-list">
              {GOAL_METRICS.map((m) => (
                <div key={m} className="goal-row">
                  <div className="goal-top">
                    <span>{GOAL_RULES[m].label}</span>
                    <b>
                      {goals.hit[m]} из {goals.days} · {pct(goals.hit[m])}%
                    </b>
                  </div>
                  <div className="track thin">
                    <div className="fill" style={{ width: `${pct(goals.hit[m])}%`, background: m === 'kcal' ? 'var(--accent)' : `var(--c-${m})` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="goal-full">
              <div>
                <span>Весь план за день</span>
                <b>
                  {goals.full} из {goals.days}
                </b>
              </div>
              <div>
                <span>Серия подряд</span>
                <b>сейчас {goals.currentStreak}, лучшая {goals.bestStreak}</b>
              </div>
            </div>
            <div className="hint">
              День засчитан, если показатель не ниже 90% нормы. Калории, жиры и углеводы не должны быть выше 110%, у белка верхней границы нет. «Весь план» — когда выполнены все четыре
              показателя.
            </div>
          </>
        )}
      </section>

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

      {aggregated ? <div className="hint">Столбики — {sizeWord}. Еда показана средним за день с записями, спорт — суммой.</div> : null}
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
        <h3>{aggregated ? `По ${sizeWord}` : 'По дням'}</h3>
        {aggregated ? (
          [...buckets].reverse().filter((b) => b.logged > 0 || b.sportMinutes > 0).map((b) => (
            <div key={b.key} className="row static">
              <div>
                <b>{bucketTitle(b, size)}</b>
                <small>
                  Б {fmt(b.avg.p)} · Ж {fmt(b.avg.f)} · У {fmt(b.avg.c)}
                  {b.sportMinutes ? ` · спорт ${fmt1(b.sportMinutes)} мин` : ''} · дней с записями {b.logged}
                </small>
              </div>
              <span>{b.logged ? fmt(b.avg.kcal) : '—'}</span>
            </div>
          ))
        ) : (
          <>
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
          </>
        )}
      </section>
    </div>
  )
}
