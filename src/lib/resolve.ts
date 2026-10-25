import { estimateFoods } from './claude'
import { findFood } from './match'
import { parseChunk, resolveGrams, splitChunks } from './parse'
import type { Per100, Product } from './types'

export type ItemSource = 'base' | 'own' | 'claude' | 'manual'

export interface DraftItem {
  key: string
  raw: string
  name: string
  grams: number
  per100: Per100 | null
  source: ItemSource | 'missing'
  guessed: boolean
  pieceG?: number
}

const EMPTY: Per100 = { kcal: 0, p: 0, f: 0, c: 0 }
let counter = 0
const nextKey = () => `d${++counter}`

export function localDrafts(text: string, products: Record<string, Product>): DraftItem[] {
  return splitChunks(text).map((raw) => {
    const parsed = parseChunk(raw)
    const ref = findFood(parsed.name, products)
    const { grams, guessed } = resolveGrams(parsed, ref)
    if (!ref) {
      return { key: nextKey(), raw, name: parsed.name || raw, grams, per100: null, source: 'missing', guessed }
    }
    return { key: nextKey(), raw, name: ref.name, grams, per100: ref.per100, source: ref.source, guessed, pieceG: ref.pieceG }
  })
}

/** Для позиций, которых нет ни в базе, ни среди ваших продуктов, спрашивает Claude. */
export async function fillWithClaude(drafts: DraftItem[], key: string): Promise<DraftItem[]> {
  const missing = drafts.filter((d) => d.source === 'missing')
  if (!missing.length) return drafts
  const found = await estimateFoods(key, missing.map((m) => m.raw))
  return drafts.map((d) => {
    const idx = missing.indexOf(d)
    if (idx < 0) return d
    const hit = found.find((f) => f.i === idx)
    if (!hit) return d
    return { ...d, name: hit.name, grams: Math.round(hit.grams), per100: hit.per100, source: 'claude', guessed: false }
  })
}

export const emptyPer100 = (): Per100 => ({ ...EMPTY })
