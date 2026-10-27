import type { ReactNode } from 'react'
import type { GoalStatus } from '../lib/goals'

const STATUS_TEXT: Record<GoalStatus, string> = { low: '', hit: 'в норме', high: 'выше нормы' }

export function Ring({ value, max, size = 150, stroke = 14, children }: { value: number; max: number; size?: number; stroke?: number; children: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const ratio = max > 0 ? Math.min(value / max, 1) : 0
  const over = max > 0 && value > max * 1.1
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? 'var(--bad)' : 'var(--accent)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * ratio} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray .5s var(--ease)' }}
        />
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  )
}

export function MacroBar({ label, value, target, color, status, onClick }: { label: string; value: number; target: number; color: string; status?: GoalStatus; onClick?: () => void }) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0
  return (
    <button className="macro" onClick={onClick} aria-label={`${label}: из чего сложилось`}>
      <div className="macro-top">
        <span>
          {label}
          {status && STATUS_TEXT[status] ? <em className={`goal ${status}`}>{status === 'hit' ? '✓ ' : ''}{STATUS_TEXT[status]}</em> : null}
        </span>
        <b>
          {Math.round(value)} <small>/ {Math.round(target)} г</small>
        </b>
      </div>
      <div className="track">
        <div className="fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </button>
  )
}
