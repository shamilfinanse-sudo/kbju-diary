import { BASE_FOODS, tokens, wordsMatch } from './foods'
import type { Per100, Product } from './types'

export interface FoodRef {
  name: string
  per100: Per100
  pieceG?: number
  tbspG?: number
  tspG?: number
  density?: number
  source: 'base' | 'own'
}

const STOP = new Set(['и', 'с', 'со', 'на', 'в', 'из', 'без', 'около', 'примерно', 'немного', 'ещё', 'еще'])

export function queryTokens(name: string): string[] {
  return tokens(name).filter((t) => !STOP.has(t) && (/[\p{L}]/u.test(t) || t.endsWith('%')))
}

function bestByWords<T extends { words: string[]; nameWords: string[]; nameLen: number }>(q: string[], list: T[]): T | null {
  let best: T | null = null
  let bestInName = -1
  let bestExtra = Infinity
  for (const item of list) {
    if (!q.every((t) => item.words.some((w) => wordsMatch(t, w)))) continue
    // Слова из самого названия весомее псевдонимов: «масла» — это масло, а не «маслины».
    const inName =
      q.filter((t) => item.nameWords.some((w) => wordsMatch(t, w))).length + q.filter((t) => item.words.includes(t)).length
    const extra = item.nameLen - q.length
    if (inName > bestInName || (inName === bestInName && extra < bestExtra)) {
      best = item
      bestInName = inName
      bestExtra = extra
    }
  }
  return best
}

export function findFood(name: string, products: Record<string, Product>): FoodRef | null {
  const q = queryTokens(name)
  if (!q.length) return null
  const own = Object.values(products).map((p) => {
    const words = tokens(p.name)
    return { p, words, nameWords: words, nameLen: words.length }
  })
  const ownHit = bestByWords(q, own)
  if (ownHit) return { name: ownHit.p.name, per100: ownHit.p.per100, pieceG: ownHit.p.pieceG, source: 'own' }
  const hit = bestByWords(q, BASE_FOODS)
  if (!hit) return null
  const { words: _w, nameWords: _nw, nameLen: _n, ...rest } = hit
  void _w
  void _nw
  void _n
  return { ...rest, source: 'base' }
}

export function productKey(name: string): string {
  return tokens(name).join(' ')
}
