import { fmt } from '../lib/format'
import { MEALS } from '../lib/meals'
import { entryTotals } from '../lib/nutrition'
import type { FoodEntry, Totals } from '../lib/types'
import { Sheet } from './Sheet'

export type Metric = 'kcal' | 'p' | 'f' | 'c'

const META: Record<Metric, { title: string; unit: string; color: string }> = {
  kcal: { title: 'Калории', unit: 'ккал', color: 'var(--accent)' },
  p: { title: 'Белки', unit: 'г', color: 'var(--c-p)' },
  f: { title: 'Жиры', unit: 'г', color: 'var(--c-f)' },
  c: { title: 'Углеводы', unit: 'г', color: 'var(--c-c)' },
}

const pick = (t: Totals, m: Metric) => t[m]

interface Props {
  metric: Metric
  entries: FoodEntry[]
  target: number
  sportKcal: number
  onClose: () => void
}

export function Breakdown({ metric, entries, target, sportKcal, onClose }: Props) {
  const meta = META[metric]
  const rows = entries
    .map((e) => ({ e, value: pick(entryTotals(e), metric) }))
    .sort((a, b) => b.value - a.value)
  const total = rows.reduce((a, r) => a + r.value, 0)
  const share = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0)
  const byMeal = MEALS.map((m) => ({ label: m.label, value: rows.filter((r) => r.e.meal === m.id).reduce((a, r) => a + r.value, 0) })).filter((m) => m.value > 0)
  const goal = metric === 'kcal' ? target + sportKcal : target

  return (
    <Sheet title={meta.title} onClose={onClose}>
      <div className="stack">
        <div className="draft-sum big">
          <b>
            {fmt(total)} {meta.unit}
          </b>
          <small>
            из {fmt(goal)} {meta.unit}
            {metric === 'kcal' && sportKcal ? ` (норма ${fmt(target)} + спорт ${fmt(sportKcal)})` : ''}
          </small>
        </div>
        {rows.length === 0 ? <div className="empty">В этот день еды ещё нет.</div> : null}
        {byMeal.length > 0 ? (
          <div className="breakdown-group">
            <div className="hint">По приёмам пищи</div>
            {byMeal.map((m) => (
              <div key={m.label} className="bd-row">
                <span>{m.label}</span>
                <b>
                  {fmt(m.value)} {meta.unit} · {share(m.value)}%
                </b>
              </div>
            ))}
          </div>
        ) : null}
        {rows.length > 0 ? (
          <div className="breakdown-group">
            <div className="hint">По продуктам, от большего вклада к меньшему</div>
            {rows.map(({ e, value }) => (
              <div key={e.id} className="bd-item">
                <div className="bd-top">
                  <span>
                    {e.name} <small>· {fmt(e.grams)} г</small>
                  </span>
                  <b>
                    {fmt(value)} {meta.unit}
                  </b>
                </div>
                <div className="track thin">
                  <div className="fill" style={{ width: `${share(value)}%`, background: meta.color }} />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Sheet>
  )
}
