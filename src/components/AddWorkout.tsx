import { useState } from 'react'
import { ClaudeError, estimateWorkout } from '../lib/claude'
import { addWorkout, newId } from '../lib/data'
import { useStore } from '../store'
import { parseWorkout, QUICK_WORKOUTS, workoutKcal } from '../lib/workouts'
import { NumField } from './NumField'

const DEFAULT_WEIGHT = 75

interface Draft {
  name: string
  minutes: number
  kcal: number
  met: number | null
  guessedMinutes: boolean
  fromClaude: boolean
}

export function AddWorkout({ date, onDone }: { date: string; onDone: () => void }) {
  const { data, update } = useStore()
  const weight = data.profile?.weightKg ?? DEFAULT_WEIGHT
  const [text, setText] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function calculate() {
    setError('')
    const local = parseWorkout(text)
    if (local) {
      setDraft({ name: local.name, minutes: local.minutes, met: local.met, kcal: workoutKcal(local.met, weight, local.minutes), guessedMinutes: local.guessedMinutes, fromClaude: false })
      return
    }
    const key = data.settings.claudeKey.trim()
    setDraft({ name: text.trim(), minutes: 30, met: null, kcal: 0, guessedMinutes: true, fromClaude: false })
    if (!key) {
      setError('Такой активности нет в списке. Впишите калории вручную или добавьте ключ Claude в профиле.')
      return
    }
    setBusy(true)
    try {
      const w = await estimateWorkout(key, text, weight)
      setDraft({ name: w.name, minutes: w.minutes, met: null, kcal: w.kcal, guessedMinutes: false, fromClaude: true })
    } catch (e) {
      setError(e instanceof ClaudeError ? e.message : 'Не получилось посчитать через Claude.')
    } finally {
      setBusy(false)
    }
  }

  function setMinutes(minutes: number) {
    setDraft((d) => (d ? { ...d, minutes, kcal: d.met ? workoutKcal(d.met, weight, minutes) : d.kcal } : d))
  }

  function save() {
    if (!draft || draft.minutes <= 0) return
    update((d) => addWorkout(d, { id: newId(), date, name: draft.name || 'Тренировка', minutes: draft.minutes, kcal: Math.round(draft.kcal) }))
    onDone()
  }

  return (
    <div className="stack">
      <div className="chips wrap">
        {QUICK_WORKOUTS.map((q) => (
          <button key={q} className="chip small" onClick={() => setText(q)}>
            {q}
          </button>
        ))}
      </div>
      <textarea rows={2} value={text} placeholder="Например: бег 40 минут, или силовая 1 час" onChange={(e) => setText(e.target.value)} />
      <button className="btn primary" disabled={busy || !text.trim()} onClick={calculate}>
        {busy ? 'Считаю…' : 'Посчитать калории'}
      </button>
      {error ? <div className="note warn">{error}</div> : null}
      {draft ? (
        <div className="draft">
          <div className="draft-head">
            <div>
              <b>{draft.name}</b>
              {draft.fromClaude ? <span className="tag claude">Claude</span> : null}
              {draft.guessedMinutes ? <span className="tag guess">время примерное</span> : null}
            </div>
          </div>
          <div className="grid2">
            <NumField label="Минут" value={draft.minutes} onChange={setMinutes} suffix="мин" />
            <NumField label="Потрачено" value={Math.round(draft.kcal)} onChange={(n) => setDraft({ ...draft, kcal: n, met: null })} suffix="ккал" />
          </div>
          <div className="hint">Оценка по вашему весу {weight} кг. Реальный расход зависит от темпа и нагрузки.</div>
          <button className="btn primary" disabled={draft.minutes <= 0} onClick={save}>
            Добавить тренировку
          </button>
        </div>
      ) : null}
    </div>
  )
}
