import { useState } from 'react'
import { removeFood, updateFood } from '../lib/data'
import { fmt } from '../lib/format'
import { entryTotals } from '../lib/nutrition'
import { MEALS } from '../lib/meals'
import { useStore } from '../store'
import type { FoodEntry } from '../lib/types'
import { IconTrash } from './Icons'
import { NumField } from './NumField'
import { Sheet } from './Sheet'

export function EditEntry({ entry, onClose }: { entry: FoodEntry; onClose: () => void }) {
  const { update } = useStore()
  const [grams, setGrams] = useState(entry.grams)
  const [meal, setMeal] = useState(entry.meal)
  const t = entryTotals({ per100: entry.per100, grams })
  return (
    <Sheet title={entry.name} onClose={onClose}>
      <div className="stack">
        <NumField label="Вес" value={grams} onChange={setGrams} suffix="г" decimals />
        <div className="chips">
          {MEALS.map((m) => (
            <button key={m.id} className={`chip${meal === m.id ? ' on' : ''}`} onClick={() => setMeal(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="draft-sum big">
          <b>{fmt(t.kcal)} ккал</b>
          <small>
            Б {fmt(t.p)} · Ж {fmt(t.f)} · У {fmt(t.c)}
          </small>
        </div>
        <button
          className="btn primary"
          disabled={grams <= 0}
          onClick={() => {
            update((d) => updateFood(d, entry.id, { grams, meal }))
            onClose()
          }}
        >
          Сохранить
        </button>
        <button
          className="btn danger"
          onClick={() => {
            update((d) => removeFood(d, entry.id))
            onClose()
          }}
        >
          <IconTrash /> Удалить
        </button>
      </div>
    </Sheet>
  )
}
