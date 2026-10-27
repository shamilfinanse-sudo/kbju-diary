import { useEffect, useState, type FocusEvent, type ReactNode } from 'react'
import { IconClose } from './Icons'

interface Viewport {
  top: number
  height: number
}

const SCROLL_TO_FIELD_DELAY_MS = 300

/**
 * Окно снизу следует за видимой частью экрана: на iPhone клавиатура не меняет высоту страницы,
 * а сдвигает её, и без этого поле ввода уезжает за пределы окна.
 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const [vp, setVp] = useState<Viewport | null>(null)

  useEffect(() => {
    document.body.classList.add('no-scroll')
    return () => document.body.classList.remove('no-scroll')
  }, [])

  useEffect(() => {
    const v = window.visualViewport
    if (!v) return
    const sync = () => setVp({ top: v.offsetTop, height: v.height })
    sync()
    v.addEventListener('resize', sync)
    v.addEventListener('scroll', sync)
    return () => {
      v.removeEventListener('resize', sync)
      v.removeEventListener('scroll', sync)
    }
  }, [])

  const keepFieldVisible = (e: FocusEvent<HTMLDivElement>) => {
    const t = e.target
    if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return
    setTimeout(() => t.scrollIntoView({ block: 'center', behavior: 'smooth' }), SCROLL_TO_FIELD_DELAY_MS)
  }

  return (
    <div className="backdrop" style={vp ? { top: vp.top, height: vp.height, bottom: 'auto' } : undefined} onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <IconClose />
          </button>
        </div>
        <div className="sheet-body" onFocusCapture={keepFieldVisible}>
          {children}
        </div>
      </div>
    </div>
  )
}
