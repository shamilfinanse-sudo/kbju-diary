import { useEffect, useState } from 'react'

interface Props {
  value: number
  onChange: (n: number) => void
  label?: string
  suffix?: string
  step?: number
  min?: number
  decimals?: boolean
}

export function NumField({ value, onChange, label, suffix, min = 0, decimals = false }: Props) {
  const [text, setText] = useState(String(value))
  useEffect(() => {
    setText((t) => (Number(t.replace(',', '.')) === value ? t : String(value)))
  }, [value])
  return (
    <label className="field">
      {label ? <span className="field-label">{label}</span> : null}
      <span className="field-box">
        <input
          inputMode={decimals ? 'decimal' : 'numeric'}
          value={text}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const t = e.target.value
            setText(t)
            const n = Number(t.replace(',', '.'))
            if (t.trim() !== '' && Number.isFinite(n) && n >= min) onChange(n)
          }}
          onBlur={() => setText(String(value))}
        />
        {suffix ? <em>{suffix}</em> : null}
      </span>
    </label>
  )
}
