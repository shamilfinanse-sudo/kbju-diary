import { useState } from 'react'
import type { MealId } from '../lib/types'
import { AddFood } from './AddFood'
import { AddWorkout } from './AddWorkout'
import { Sheet } from './Sheet'

export function AddSheet({ date, meal, initialTab, onClose }: { date: string; meal: MealId | null; initialTab: 'food' | 'sport'; onClose: () => void }) {
  const [tab, setTab] = useState(initialTab)
  return (
    <Sheet title="Добавить" onClose={onClose}>
      <div className="seg">
        <button className={tab === 'food' ? 'on' : ''} onClick={() => setTab('food')}>
          Еда
        </button>
        <button className={tab === 'sport' ? 'on' : ''} onClick={() => setTab('sport')}>
          Спорт
        </button>
      </div>
      {tab === 'food' ? <AddFood date={date} meal={meal} onDone={onClose} /> : <AddWorkout date={date} onDone={onClose} />}
    </Sheet>
  )
}
