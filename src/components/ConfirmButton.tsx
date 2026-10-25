import { useEffect, useState, type ReactNode } from 'react'

const DISARM_MS = 4000

/** Двойное нажатие вместо окна подтверждения: первое нажатие готовит действие, второе выполняет. */
export function ConfirmButton({ children, ask, onConfirm, danger = false }: { children: ReactNode; ask: string; onConfirm: () => void; danger?: boolean }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), DISARM_MS)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      className={`btn${danger || armed ? ' danger' : ''}`}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else setArmed(true)
      }}
    >
      {armed ? ask : children}
    </button>
  )
}
