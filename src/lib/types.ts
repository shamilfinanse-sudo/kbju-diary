export type MealId = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type ThemeId = 'mint' | 'neo' | 'forest'
export type Sex = 'm' | 'f'
export type Goal = 'lose' | 'keep' | 'gain'

export interface Per100 {
  kcal: number
  p: number
  f: number
  c: number
}

export interface FoodEntry {
  id: string
  date: string
  meal: MealId
  name: string
  grams: number
  per100: Per100
  source: 'base' | 'own' | 'claude' | 'manual'
}

export interface WorkoutEntry {
  id: string
  date: string
  name: string
  minutes: number
  kcal: number
}

export interface Profile {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activity: number
  goal: Goal
}

export interface Targets {
  kcal: number
  p: number
  f: number
  c: number
}

export interface Product {
  name: string
  per100: Per100
  pieceG?: number
}

export interface Settings {
  theme: ThemeId
  claudeKey: string
  customTargets: boolean
}

export interface AppData {
  v: 1
  profile: Profile | null
  targets: Targets | null
  entries: FoodEntry[]
  workouts: WorkoutEntry[]
  products: Record<string, Product>
  settings: Settings
}

export interface Totals {
  kcal: number
  p: number
  f: number
  c: number
}
