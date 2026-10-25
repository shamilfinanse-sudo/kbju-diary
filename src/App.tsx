import { useState } from 'react'
import { AddSheet } from './components/AddSheet'
import { IconChart, IconDiary, IconPlus, IconUser } from './components/Icons'
import { todayISO } from './lib/dates'
import { Diary } from './screens/Diary'
import { Dynamics } from './screens/Dynamics'
import { Profile } from './screens/Profile'
import type { MealId } from './lib/types'

type Tab = 'diary' | 'dynamics' | 'profile'

interface AddState {
  tab: 'food' | 'sport'
  meal: MealId | null
}

export function App() {
  const [tab, setTab] = useState<Tab>(() => {
    const h = location.hash.slice(1)
    return h === 'dynamics' || h === 'profile' ? h : 'diary'
  })
  const [date, setDate] = useState(todayISO())
  const [add, setAdd] = useState<AddState | null>(null)

  const openDay = (d: string) => {
    setDate(d)
    setTab('diary')
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="app">
      <div className="deco" aria-hidden="true" />
      <main>
        {tab === 'diary' ? <Diary date={date} setDate={setDate} openAdd={(t, m) => setAdd({ tab: t, meal: m ?? null })} goProfile={() => setTab('profile')} /> : null}
        {tab === 'dynamics' ? <Dynamics openDay={openDay} /> : null}
        {tab === 'profile' ? <Profile /> : null}
      </main>

      {tab !== 'profile' ? (
        <button className="fab" aria-label="Добавить еду или тренировку" onClick={() => setAdd({ tab: 'food', meal: null })}>
          <IconPlus />
        </button>
      ) : null}

      <nav className="tabbar">
        <button className={tab === 'diary' ? 'on' : ''} onClick={() => setTab('diary')}>
          <IconDiary />
          <span>Дневник</span>
        </button>
        <button className={tab === 'dynamics' ? 'on' : ''} onClick={() => setTab('dynamics')}>
          <IconChart />
          <span>Динамика</span>
        </button>
        <button className={tab === 'profile' ? 'on' : ''} onClick={() => setTab('profile')}>
          <IconUser />
          <span>Профиль</span>
        </button>
      </nav>

      {add ? <AddSheet date={date} meal={add.meal} initialTab={add.tab} onClose={() => setAdd(null)} /> : null}
    </div>
  )
}
