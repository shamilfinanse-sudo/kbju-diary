import { useState } from 'react'

export interface Bar {
  label: string
  segments: Array<{ value: number; color: string }>
  caption: string
}

const W = 340
const H = 150
const LABEL_H = 22
const TOP = 14

export function Bars({ bars, target, labelEvery = 1 }: { bars: Bar[]; target?: number; labelEvery?: number }) {
  const [sel, setSel] = useState<number | null>(null)
  const totals = bars.map((b) => b.segments.reduce((a, s) => a + s.value, 0))
  const max = Math.max(...totals, target ? target * 1.15 : 0, 1)
  const plotH = H - LABEL_H - TOP
  const slot = W / Math.max(bars.length, 1)
  const barW = Math.max(Math.min(slot * 0.62, 26), 3)
  const y = (v: number) => TOP + plotH - (v / max) * plotH
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="График по дням">
        {target ? (
          <g>
            <line x1="0" x2={W} y1={y(target)} y2={y(target)} stroke="var(--muted)" strokeDasharray="4 4" strokeWidth="1" opacity="0.7" />
            <text x={W} y={y(target) - 4} textAnchor="end" fontSize="10" fill="var(--muted)">
              норма
            </text>
          </g>
        ) : null}
        {bars.map((b, i) => {
          const x = i * slot + (slot - barW) / 2
          let acc = 0
          return (
            <g key={i} opacity={sel === null || sel === i ? 1 : 0.45}>
              {b.segments.map((s, k) => {
                const top = y(acc + s.value)
                const h = y(acc) - top
                acc += s.value
                return h > 0 ? <rect key={k} x={x} y={top} width={barW} height={h} rx={Math.min(3, barW / 2)} fill={s.color} /> : null
              })}
              {i % labelEvery === 0 ? (
                <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">
                  {b.label}
                </text>
              ) : null}
              <rect x={i * slot} y="0" width={slot} height={H} fill="transparent" onClick={() => setSel(sel === i ? null : i)} />
            </g>
          )
        })}
      </svg>
      <div className="chart-caption">{sel !== null ? bars[sel].caption : 'Нажмите на столбик, чтобы увидеть день'}</div>
    </div>
  )
}
