import { addDays, shortDate, todayISO } from '../lib/dates'

export function DatePick({ value, onChange }: { value: string; onChange: (d: string) => void }) {
  const today = todayISO()
  const quick: Array<[string, string]> = [
    [today, 'Сегодня'],
    [addDays(today, -1), 'Вчера'],
    [addDays(today, -2), 'Позавчера'],
  ]
  const isQuick = quick.some(([d]) => d === value)
  return (
    <div>
      <div className="hint">За какой день записать</div>
      <div className="chips wrap">
        {quick.map(([d, label]) => (
          <button key={d} className={`chip${value === d ? ' on' : ''}`} onClick={() => onChange(d)}>
            {label}
          </button>
        ))}
        <label className={`chip datechip${isQuick ? '' : ' on'}`}>
          {isQuick ? 'Другая дата' : shortDate(value)}
          <input type="date" max={today} value={value} onChange={(e) => e.target.value && onChange(e.target.value)} aria-label="Выбрать другую дату" />
        </label>
      </div>
    </div>
  )
}
