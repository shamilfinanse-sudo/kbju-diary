import type { FoodRef } from './match'

export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'pc' | 'tbsp' | 'tsp' | 'cup'

export interface ParsedItem {
  raw: string
  name: string
  amount: number | null
  unit: Unit | null
}

const UNITS: Array<[RegExp, Unit]> = [
  [/^(?:ст\.?\s?л\.?|столов\p{L}*\s+ложк\p{L}*)/iu, 'tbsp'],
  [/^(?:ч\.?\s?л\.?|чайн\p{L}*\s+ложк\p{L}*)/iu, 'tsp'],
  [/^(?:кг|килограмм\p{L}*)/iu, 'kg'],
  [/^(?:мл|миллилитр\p{L}*)/iu, 'ml'],
  [/^(?:литр\p{L}*|л(?![\p{L}]))/iu, 'l'],
  [/^(?:гр?(?![\p{L}])|грамм\p{L}*|гр\.)/iu, 'g'],
  [/^(?:шт\p{L}*|штук\p{L}*|кус\p{L}*|ломт\p{L}*|долек|дольк\p{L}*)/iu, 'pc'],
  [/^(?:стакан\p{L}*|чашк\p{L}*)/iu, 'cup'],
  [/^ложк\p{L}*/iu, 'tbsp'],
]

const NUM_RE = /(\d+(?:[.,]\d+)?)(?!\d|[.,]\d|\s*%)/

function matchUnit(text: string): { unit: Unit; length: number } | null {
  const t = text.trimStart()
  const lead = text.length - t.length
  for (const [re, unit] of UNITS) {
    const m = re.exec(t)
    if (m) return { unit, length: lead + m[0].length }
  }
  return null
}

export function splitChunks(text: string): string[] {
  return text
    .replace(/(\d+(?:[.,]\d+)?)\s*%/g, '$1%')
    .split(/[;\n]|,(?!\d)|\s+\+\s+|\s+и\s+/u)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function parseChunk(raw: string): ParsedItem {
  const text = raw.replace(/(\d+(?:[.,]\d+)?)\s*%/g, '$1%')
  const m = NUM_RE.exec(text)
  if (m) {
    const amount = Number(m[1].replace(',', '.'))
    const after = text.slice(m.index + m[0].length)
    const u = matchUnit(after)
    const rest = text.slice(0, m.index) + ' ' + (u ? after.slice(u.length) : after)
    return { raw, name: clean(rest), amount, unit: u?.unit ?? null }
  }
  const words = text.split(/\s+/)
  for (let i = 0; i < words.length; i++) {
    const u = matchUnit(words[i])
    if (u && u.length === words[i].length && ['tbsp', 'tsp', 'cup', 'pc'].includes(u.unit)) {
      const rest = [...words.slice(0, i), ...words.slice(i + 1)].join(' ')
      return { raw, name: clean(rest), amount: 1, unit: u.unit }
    }
  }
  return { raw, name: clean(text), amount: null, unit: null }
}

function clean(s: string): string {
  return s.replace(/^[\s\-–—:.()]+|[\s\-–—:.()]+$/g, '').replace(/\s+/g, ' ')
}

const FALLBACK_PORTION_G = 100
const CUP_G = 200
const MAX_PIECES_WITHOUT_UNIT = 20

export function resolveGrams(item: ParsedItem, ref?: Pick<FoodRef, 'pieceG' | 'tbspG' | 'tspG' | 'density'> | null): { grams: number; guessed: boolean } {
  const density = ref?.density ?? 1
  const n = item.amount
  if (n === null) return { grams: ref?.pieceG ?? FALLBACK_PORTION_G, guessed: true }
  switch (item.unit) {
    case 'g':
      return { grams: n, guessed: false }
    case 'kg':
      return { grams: n * 1000, guessed: false }
    case 'ml':
      return { grams: n * density, guessed: false }
    case 'l':
      return { grams: n * 1000 * density, guessed: false }
    case 'pc':
      return { grams: n * (ref?.pieceG ?? FALLBACK_PORTION_G), guessed: !ref?.pieceG }
    case 'tbsp':
      return { grams: n * (ref?.tbspG ?? 15), guessed: !ref?.tbspG }
    case 'tsp':
      return { grams: n * (ref?.tspG ?? 5), guessed: !ref?.tspG }
    case 'cup':
      return { grams: n * CUP_G * density, guessed: false }
    default:
      if (ref?.pieceG && n <= MAX_PIECES_WITHOUT_UNIT) return { grams: n * ref.pieceG, guessed: false }
      return { grams: n, guessed: false }
  }
}
