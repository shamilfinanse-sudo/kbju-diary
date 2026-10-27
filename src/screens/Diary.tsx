import { useMemo, useState } from 'react'
import { Breakdown, type Metric } from '../components/Breakdown'
import { EditEntry } from '../components/EditEntry'
import { IconBolt, IconFlame, IconLeft, IconRight, IconTrash } from '../components/Icons'
import { MacroBar, Ring } from '../components/Ring'
import { addDays, longDate, todayISO } from '../lib/dates'
import { removeWorkout } from '../lib/data'
import { fmt, minutesText } from '../lib/format'
import { MEALS } from '../lib/meals'
import { entryTotals } from '../lib/nutrition'
import { FALLBACK_TARGETS } from '../lib/norms'
import { dayGoals } from '../lib/goals'
import { daySummary } from '../lib/stats'
import { useStore } from '../store'
import type { FoodEntry, MealId } from '../lib/types'

interface Props {
  date: string
  setDate: (d: string) => void
  openAdd: (tab: 'food' | 'sport', meal?: MealId) => void
  goProfile: () => void
}

export function Diary({ date, setDate, openAdd, goProfile }: Props) {
  const { data, update } = useStore()
  const [editing, setEditing] = useState<FoodEntry | null>(null)
  const [metric, setMetric] = useState<Metric | null>(null)
  const targets = data.targets ?? FALLBACK_TARGETS
  const day = useMemo(() => daySummary(data, date), [data, date])
  const goals = dayGoals(day, targets)
  const left = targets.kcal + day.sportKcal - day.totals.kcal
  const foods = data.entries.filter((e) => e.date === date)
  const workouts = data.workouts.filter((w) => w.date === date)
  const isToday = date === todayISO()

  return (
    <div className="screen">
      <div className="datebar">
        <button className="icon-btn round" onClick={() => setDate(addDays(date, -1))} aria-label="Предыдущий день">
          <IconLeft />
        </button>
        <label className="datelabel">
          <span>{longDate(date)}</span>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Выбрать дату" />
        </label>
        <button className="icon-btn round" onClick={() => setDate(addDays(date, 1))} disabled={isToday} aria-label="Следующий день">
          <IconRight />
        </button>
      </div>

      {!data.profile ? (
        <button className="note banner" onClick={goProfile}>
          Укажите рост, вес и цель — я рассчитаю вашу норму. Пока показана примерная.
        </button>
      ) : null}

      <section className="card summary tappable" role="button" tabIndex={0} onClick={() => setMetric('kcal')} onKeyDown={(e) => e.key === 'Enter' && setMetric('kcal')}>
        <Ring value={day.totals.kcal} max={targets.kcal + day.sportKcal}>
          <b className="ring-big">{fmt(Math.abs(left))}</b>
          <span className="ring-small">{left >= 0 ? 'осталось ккал' : 'сверх нормы'}</span>
        </Ring>
        <div className="summary-side">
          <div className="kv">
            <span>Съедено</span>
            <b>{fmt(day.totals.kcal)} ккал</b>
          </div>
          <div className="kv">
            <span>Норма</span>
            <b>{fmt(targets.kcal)} ккал</b>
          </div>
          <div className="kv sport">
            <span>
              <IconFlame /> Спорт
            </span>
            <b>{day.sportKcal ? `+${fmt(day.sportKcal)} ккал` : '—'}</b>
          </div>
        </div>
      </section>

      <section className="card macros">
        <MacroBar label="Белки" value={day.totals.p} target={targets.p} color="var(--c-p)" status={day.hasFood ? goals.p : undefined} onClick={() => setMetric('p')} />
        <MacroBar label="Жиры" value={day.totals.f} target={targets.f} color="var(--c-f)" status={day.hasFood ? goals.f : undefined} onClick={() => setMetric('f')} />
        <MacroBar label="Углеводы" value={day.totals.c} target={targets.c} color="var(--c-c)" status={day.hasFood ? goals.c : undefined} onClick={() => setMetric('c')} />
      </section>

      {MEALS.map((m) => {
        const items = foods.filter((e) => e.meal === m.id)
        const kcal = items.reduce((a, e) => a + entryTotals(e).kcal, 0)
        return (
          <section key={m.id} className="card meal">
            <div className="meal-head">
              <h3>{m.label}</h3>
              <span>{items.length ? `${fmt(kcal)} ккал` : ''}</span>
            </div>
            {items.map((e) => {
              const t = entryTotals(e)
              return (
                <button key={e.id} className="row" onClick={() => setEditing(e)}>
                  <div>
                    <b>{e.name}</b>
                    <small>
                      {fmt(e.grams)} г · Б {fmt(t.p)} · Ж {fmt(t.f)} · У {fmt(t.c)}
                    </small>
                  </div>
                  <span>{fmt(t.kcal)}</span>
                </button>
              )
            })}
            <button className="add-line" onClick={() => openAdd('food', m.id)}>
              + Добавить
            </button>
          </section>
        )
      })}

      <section className="card meal">
        <div className="meal-head">
          <h3>
            <IconBolt /> Спорт
          </h3>
          <span>{day.hasSport ? `${minutesText(day.sportMinutes)} · ${fmt(day.sportKcal)} ккал` : ''}</span>
        </div>
        {workouts.map((w) => (
          <div key={w.id} className="row static">
            <div>
              <b>{w.name}</b>
              <small>{minutesText(w.minutes)}</small>
            </div>
            <span>−{fmt(w.kcal)}</span>
            <button className="icon-btn" aria-label="Удалить тренировку" onClick={() => update((d) => removeWorkout(d, w.id))}>
              <IconTrash />
            </button>
          </div>
        ))}
        {!workouts.length ? <div className="empty">В этот день тренировок нет</div> : null}
        <button className="add-line" onClick={() => openAdd('sport')}>
          + Тренировка
        </button>
      </section>

      {metric ? <Breakdown metric={metric} entries={foods} target={targets[metric]} sportKcal={day.sportKcal} onClose={() => setMetric(null)} /> : null}
      {editing ? <EditEntry entry={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  )
}
