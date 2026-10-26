import type { Per100 } from './types'

const MODEL = 'claude-haiku-5-5'
const MAX_TOKENS = 1500
const MAX_KCAL_PER_100 = 900

export class ClaudeError extends Error {}

export interface ClaudeFood {
  i: number
  name: string
  grams: number
  per100: Per100
}

export interface ClaudeWorkout {
  name: string
  minutes: number
  kcal: number
}

async function ask(key: string, system: string, user: string): Promise<string> {
  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system, messages: [{ role: 'user', content: user }] }),
    })
  } catch {
    throw new ClaudeError('Нет связи с Claude. Проверьте интернет.')
  }
  if (res.status === 401 || res.status === 403) throw new ClaudeError('Ключ Claude не подошёл. Проверьте его в профиле.')
  if (res.status === 429) throw new ClaudeError('Claude просит подождать. Попробуйте через минуту.')
  if (!res.ok) throw new ClaudeError(`Claude ответил ошибкой ${res.status}.`)
  const body = (await res.json()) as { content?: Array<{ type: string; text?: string }> }
  const text = body.content?.find((b) => b.type === 'text')?.text
  if (!text) throw new ClaudeError('Claude вернул пустой ответ.')
  return text
}

function extractJson(text: string, open: '[' | '{'): unknown {
  const close = open === '[' ? ']' : '}'
  const a = text.indexOf(open)
  const b = text.lastIndexOf(close)
  if (a < 0 || b <= a) throw new ClaudeError('Не удалось разобрать ответ Claude.')
  try {
    return JSON.parse(text.slice(a, b + 1))
  } catch {
    throw new ClaudeError('Не удалось разобрать ответ Claude.')
  }
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null)

export function validateFoods(raw: unknown): ClaudeFood[] {
  if (!Array.isArray(raw)) return []
  const out: ClaudeFood[] = []
  for (const r of raw as Array<Record<string, unknown>>) {
    const [i, grams, kcal, p, f, c] = [num(r.i), num(r.grams), num(r.kcal), num(r.p), num(r.f), num(r.c)]
    if (i === null || grams === null || kcal === null || p === null || f === null || c === null) continue
    if (grams <= 0 || kcal > MAX_KCAL_PER_100) continue
    out.push({ i, name: typeof r.name === 'string' && r.name ? r.name : 'Продукт', grams, per100: { kcal, p, f, c } })
  }
  return out
}

const FOOD_SYSTEM = `Ты нутрициолог. Пользователь присылает пронумерованные строки о том, что он съел.
Для каждой строки определи продукт или блюдо, вес в граммах (переведи штуки, ложки, стаканы; если вес не указан, возьми типичную порцию) и КБЖУ на 100 г в том виде, в каком это едят (готовое блюдо, а не сухое сырьё, если не сказано иное).
Ответь только JSON-массивом без пояснений: [{"i":0,"name":"название","grams":150,"kcal":120,"p":5,"f":3,"c":18}]
i — номер строки, kcal в ккал, p, f, c в граммах на 100 г продукта.`

export async function estimateFoods(key: string, lines: string[]): Promise<ClaudeFood[]> {
  const user = lines.map((l, i) => `${i}: ${l}`).join('\n')
  const text = await ask(key, FOOD_SYSTEM, user)
  return validateFoods(extractJson(text, '['))
}

const WORKOUT_SYSTEM = `Ты тренер. Оцени расход калорий за тренировку для человека с указанным весом.
Ответь только JSON-объектом без пояснений: {"name":"короткое название","minutes":40,"kcal":350}
Если время не указано, возьми типичное (30 минут).`

export async function estimateWorkout(key: string, text: string, weightKg: number): Promise<ClaudeWorkout> {
  const answer = await ask(key, WORKOUT_SYSTEM, `Вес: ${weightKg} кг. Тренировка: ${text}`)
  const raw = extractJson(answer, '{') as Record<string, unknown>
  const [minutes, kcal] = [num(raw.minutes), num(raw.kcal)]
  if (minutes === null || kcal === null || minutes <= 0) throw new ClaudeError('Не удалось разобрать ответ Claude.')
  return { name: typeof raw.name === 'string' && raw.name ? raw.name : text, minutes: Math.round(minutes), kcal: Math.round(kcal) }
}

/** Дешёвая проверка ключа: список моделей ничего не стоит. */
export async function checkKey(key: string): Promise<void> {
  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/models?limit=1', {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    })
  } catch {
    throw new ClaudeError('Нет связи с Claude. Проверьте интернет.')
  }
  if (res.status === 401 || res.status === 403) throw new ClaudeError('Ключ не подошёл. Проверьте, что скопировали его целиком.')
  if (!res.ok) throw new ClaudeError(`Claude ответил ошибкой ${res.status}.`)
}
