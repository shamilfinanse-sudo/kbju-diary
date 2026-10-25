import { useMemo, useState } from 'react'
import { ClaudeError } from '../lib/claude'
import { newId, addFood, saveProducts } from '../lib/data'
import { fmt } from '../lib/format'
import { MEALS, mealByTime } from '../lib/meals'
import { scale } from '../lib/nutrition'
import { emptyPer100, fillWithClaude, localDrafts, type DraftItem } from '../lib/resolve'
import { useStore } from '../store'
import type { MealId, Per100 } from '../lib/types'
import { NumField } from './NumField'
import { IconClose } from './Icons'

const SOURCE_LABEL: Record<string, string> = { base: 'база', own: 'ваш продукт', claude: 'Claude', manual: 'вручную' }
const RECENT_DAYS_BACK = 60
const RECENT_COUNT = 8

export function AddFood({ date, meal: initialMeal, onDone }: { date: string; meal: MealId | null; onDone: () => void }) {
  const { data, update } = useStore()
  const [text, setText] = useState('')
  const [meal, setMeal] = useState<MealId>(initialMeal ?? mealByTime(new Date().getHours()))
  const [drafts, setDrafts] = useState<DraftItem[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const recent = useMemo(() => {
    const cutoff = Date.now() - RECENT_DAYS_BACK * 86400000
    const stats = new Map<string, { n: number; grams: number }>()
    for (const e of data.entries) {
      if (new Date(e.date).getTime() < cutoff) continue
      const s = stats.get(e.name)
      stats.set(e.name, { n: (s?.n ?? 0) + 1, grams: e.grams })
    }
    return [...stats.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, RECENT_COUNT)
  }, [data.entries])

  async function calculate() {
    setError('')
    const local = localDrafts(text, data.products)
    if (!local.length) return
    setDrafts(local)
    const key = data.settings.claudeKey.trim()
    if (!local.some((d) => d.source === 'missing')) return
    if (!key) {
      setError('Не нашёл в базе. Впишите КБЖУ на 100 г вручную или добавьте ключ Claude в профиле — он досчитает сам.')
      return
    }
    setBusy(true)
    try {
      setDrafts(await fillWithClaude(local, key))
    } catch (e) {
      setError(e instanceof ClaudeError ? e.message : 'Не получилось посчитать через Claude.')
    } finally {
      setBusy(false)
    }
  }

  const patch = (key: string, p: Partial<DraftItem>) => setDrafts((ds) => ds && ds.map((d) => (d.key === key ? { ...d, ...p } : d)))
  const ready = drafts?.filter((d) => d.per100 && d.grams > 0) ?? []

  function save() {
    if (!ready.length) return
    update((d) => {
      const withEntries = addFood(
        d,
        ready.map((r) => ({
          id: newId(),
          date,
          meal,
          name: r.name,
          grams: r.grams,
          per100: r.per100 as Per100,
          source: r.source === 'missing' ? 'manual' : r.source,
        })),
      )
      const learned = ready.filter((r) => r.source === 'claude' || r.source === 'manual').map((r) => ({ name: r.name, per100: r.per100 as Per100 }))
      return saveProducts(withEntries, learned)
    })
    onDone()
  }

  const total = ready.reduce((a, r) => a + scale(r.per100 as Per100, r.grams).kcal, 0)

  return (
    <div className="stack">
      <div className="chips">
        {MEALS.map((m) => (
          <button key={m.id} className={`chip${meal === m.id ? ' on' : ''}`} onClick={() => setMeal(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <textarea
        rows={3}
        value={text}
        placeholder="Например: гречка 150 г, куриная грудка 200 г, яблоко 1 шт"
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      {recent.length > 0 && !drafts ? (
        <div>
          <div className="hint">Недавнее — нажмите, чтобы добавить в строку</div>
          <div className="chips wrap">
            {recent.map(([name, s]) => (
              <button key={name} className="chip small" onClick={() => setText((t) => (t.trim() ? `${t.trim().replace(/,$/, '')}, ` : '') + `${name} ${Math.round(s.grams)} г`)}>
                {name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <button className="btn primary" disabled={busy || !text.trim()} onClick={calculate}>
        {busy ? 'Считаю…' : 'Посчитать КБЖУ'}
      </button>
      {error ? <div className="note warn">{error}</div> : null}

      {drafts ? (
        <div className="drafts">
          {drafts.map((d) => {
            const t = d.per100 ? scale(d.per100, d.grams) : null
            return (
              <div key={d.key} className="draft">
                <div className="draft-head">
                  <div>
                    <b>{d.name}</b>
                    <span className={`tag ${d.source}`}>{d.source === 'missing' ? 'не найдено' : SOURCE_LABEL[d.source]}</span>
                    {d.guessed ? <span className="tag guess">вес примерный</span> : null}
                  </div>
                  <button className="icon-btn" aria-label="Убрать" onClick={() => setDrafts((ds) => (ds ? ds.filter((x) => x.key !== d.key) : ds))}>
                    <IconClose />
                  </button>
                </div>
                <div className="draft-row">
                  <NumField value={d.grams} onChange={(n) => patch(d.key, { grams: n })} suffix="г" decimals />
                  {t ? (
                    <div className="draft-sum">
                      <b>{fmt(t.kcal)} ккал</b>
                      <small>
                        Б {fmt(t.p)} · Ж {fmt(t.f)} · У {fmt(t.c)}
                      </small>
                    </div>
                  ) : null}
                </div>
                {d.source === 'missing' || d.source === 'manual' ? <ManualPer100 per100={d.per100 ?? emptyPer100()} onChange={(p) => patch(d.key, { per100: p, source: 'manual' })} /> : null}
              </div>
            )
          })}
          <button className="btn primary" disabled={!ready.length} onClick={save}>
            Добавить в дневник{ready.length ? ` · ${fmt(total)} ккал` : ''}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function ManualPer100({ per100, onChange }: { per100: Per100; onChange: (p: Per100) => void }) {
  return (
    <div className="manual">
      <div className="hint">КБЖУ на 100 г</div>
      <div className="grid4">
        <NumField label="ккал" value={per100.kcal} onChange={(n) => onChange({ ...per100, kcal: n })} decimals />
        <NumField label="Б" value={per100.p} onChange={(n) => onChange({ ...per100, p: n })} decimals />
        <NumField label="Ж" value={per100.f} onChange={(n) => onChange({ ...per100, f: n })} decimals />
        <NumField label="У" value={per100.c} onChange={(n) => onChange({ ...per100, c: n })} decimals />
      </div>
    </div>
  )
}
