import { useState } from 'react'
import type { MealId } from '../lib/types'
import { AddFood } from './AddFood'
import { AddWorkout } from './AddWorkout'
import { DatePick } from './DatePick'
import { Sheet } from './Sheet'

interface Props {
  date: string
  meal: MealId | null
  initialTab: 'food' | 'sport'
  onClose: () => void
  onSaved: (date: string) => void
}

export function AddSheet({ date, meal, initialTab, onClose, onSaved }: Props) {
  const [tab, setTab] = useState(initialTab)
  const [day, setDay] = useState(date)
  const done = () => onSaved(day)
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
      <DatePick value={day} onChange={setDay} />
      {tab === 'food' ? <AddFood date={day} meal={meal} onDone={done} /> : <AddWorkout date={day} onDone={done} />}
    </Sheet>
  )
}
