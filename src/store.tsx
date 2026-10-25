import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadData, saveData } from './lib/data'
import type { AppData, ThemeId } from './lib/types'

interface Store {
  data: AppData
  update: (fn: (d: AppData) => AppData) => void
  saved: boolean
}

const Ctx = createContext<Store | null>(null)

const THEME_COLOR: Record<ThemeId, string> = { mint: '#b9cbc5', neo: '#e4e7ed', forest: '#1d4a3c' }

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData)
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    setSaved(saveData(data))
  }, [data])

  useEffect(() => {
    const theme = data.settings.theme
    document.documentElement.setAttribute('data-look', theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  }, [data.settings.theme])

  const update = useCallback((fn: (d: AppData) => AppData) => setData(fn), [])
  const value = useMemo(() => ({ data, update, saved }), [data, update, saved])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider missing')
  return s
}
