import { productKey } from './match'
import type { AppData, FoodEntry, Product, Profile, Settings, Targets, WorkoutEntry } from './types'

export const STORAGE_KEY = 'kbju:v1'

export function createInitial(): AppData {
  return {
    v: 1,
    profile: null,
    targets: null,
    entries: [],
    workouts: [],
    products: {},
    settings: { theme: 'forest', claudeKey: '', customTargets: false },
  }
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export const addFood = (d: AppData, items: FoodEntry[]): AppData => ({ ...d, entries: [...d.entries, ...items] })

export const updateFood = (d: AppData, id: string, patch: Partial<FoodEntry>): AppData => ({
  ...d,
  entries: d.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
})

export const removeFood = (d: AppData, id: string): AppData => ({ ...d, entries: d.entries.filter((e) => e.id !== id) })

export const addWorkout = (d: AppData, w: WorkoutEntry): AppData => ({ ...d, workouts: [...d.workouts, w] })

export const removeWorkout = (d: AppData, id: string): AppData => ({ ...d, workouts: d.workouts.filter((w) => w.id !== id) })

export const saveProducts = (d: AppData, list: Product[]): AppData => ({
  ...d,
  products: list.reduce((acc, p) => ({ ...acc, [productKey(p.name)]: p }), d.products),
})

export const setProfile = (d: AppData, profile: Profile, targets: Targets | null): AppData => ({
  ...d,
  profile,
  targets: targets ?? d.targets,
})

export const setTargets = (d: AppData, targets: Targets, custom: boolean): AppData => ({
  ...d,
  targets,
  settings: { ...d.settings, customTargets: custom },
})

export const setSettings = (d: AppData, patch: Partial<Settings>): AppData => ({ ...d, settings: { ...d.settings, ...patch } })

export function parseBackup(text: string): AppData {
  const raw = JSON.parse(text) as Partial<AppData>
  if (!raw || raw.v !== 1 || !Array.isArray(raw.entries) || !Array.isArray(raw.workouts)) {
    throw new Error('Это не файл копии дневника')
  }
  const base = createInitial()
  return { ...base, ...raw, settings: { ...base.settings, ...raw.settings }, products: raw.products ?? {} }
}

export function loadData(): AppData {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (text) return parseBackup(text)
  } catch {
    /* повреждённые данные или нет доступа к хранилищу — начинаем с чистого листа */
  }
  return createInitial()
}

export function saveData(d: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
    return true
  } catch {
    return false
  }
}
