// Проверка вёрстки: открывает собранный сайт в телефонных размерах, проходит экраны и окна
// во всех видах и ищет выходы за край, наложения текста и рамок. Запуск: npm run check:layout
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..', 'dist')
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const WIDTHS = process.argv.includes('--quick') ? [390] : [320, 390, 430]
const THEMES = process.argv.includes('--quick') ? ['forest'] : ['forest', 'mint', 'neo']
const SETTLE_MS = 450
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/json' }

function serve() {
  const server = http.createServer(async (req, res) => {
    const raw = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
    const path = raw === '/' ? '/index.html' : raw
    try {
      const file = await readFile(join(ROOT, path))
      res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream' })
      res.end(file)
    } catch {
      res.writeHead(404).end()
    }
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)))
}

/** Выполняется внутри страницы. Возвращает список найденных проблем. */
function analyzePage(opts) {
  const issues = []
  const vw = document.documentElement.clientWidth
  const snippet = (el) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} «${(el.textContent || '').trim().slice(0, 30)}»`
  const cs = (el) => getComputedStyle(el)
  const visible = (el) => {
    const s = cs(el)
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }
  const backdrop = document.querySelector('.backdrop')
  const scope = backdrop ?? document.body
  const layerOf = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) if (cs(n).position === 'fixed') return n === backdrop ? 'sheet' : 'fixed'
    return 'page'
  }
  const clippedByScroller = (el) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      const o = cs(n).overflowX
      if (o === 'auto' || o === 'scroll' || o === 'hidden') return true
    }
    return false
  }
  const all = [...scope.querySelectorAll('*')].filter((el) => visible(el) && !['SCRIPT', 'STYLE', 'svg', 'path', 'circle', 'rect', 'line', 'g', 'text'].includes(el.tagName))

  // 1. страница не шире экрана
  if (document.documentElement.scrollWidth > vw + 1) issues.push(`страница шире экрана: ${document.documentElement.scrollWidth} > ${vw}`)

  // 2. дочерний элемент не выходит за рамку родителя
  const allowEscape = (el) => el.matches('.swatches i, .chips.periods, .chips.periods *, .chips, .chips *')
  for (const el of all) {
    if (layerOf(el) === 'fixed' || cs(el).position === 'absolute' || allowEscape(el)) continue
    const p = el.parentElement
    if (!p || p === document.body || !visible(p) || cs(p).display === 'contents') continue
    const r = el.getBoundingClientRect()
    const pr = p.getBoundingClientRect()
    if (r.right > pr.right + 1.5 || r.left < pr.left - 1.5) issues.push(`«${snippet(el)}» выходит за рамку «${snippet(p)}» (${Math.round(Math.max(r.right - pr.right, pr.left - r.left))}px)`)
  }

  // 3. текст внутри своей рамки и в пределах экрана
  const textRects = []
  for (const el of all) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim())
    if (!own.length) continue
    const range = document.createRange()
    let box = null
    for (const n of own) {
      range.selectNodeContents(n)
      for (const r of range.getClientRects()) {
        if (r.width < 1 || r.height < 1) continue
        box = box ? { left: Math.min(box.left, r.left), top: Math.min(box.top, r.top), right: Math.max(box.right, r.right), bottom: Math.max(box.bottom, r.bottom) } : { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
      }
    }
    if (!box) continue
    textRects.push({ el, box, layer: layerOf(el), clipped: clippedByScroller(el) })
    const er = el.getBoundingClientRect()
    const ellipsis = cs(el).textOverflow === 'ellipsis'
    if (!ellipsis && !clippedByScroller(el) && (box.right > er.right + 1.5 || box.left < er.left - 1.5)) issues.push(`текст «${snippet(el)}» не помещается в свою рамку`)
    if (!clippedByScroller(el) && (box.right > vw + 1 || box.left < -1)) issues.push(`текст «${snippet(el)}» за краем экрана`)
  }

  // 4. текст на тексте
  for (let i = 0; i < textRects.length; i++) {
    for (let j = i + 1; j < textRects.length; j++) {
      const a = textRects[i]
      const b = textRects[j]
      if (a.layer !== b.layer || a.clipped !== b.clipped) continue
      const w = Math.min(a.box.right, b.box.right) - Math.max(a.box.left, b.box.left)
      const h = Math.min(a.box.bottom, b.box.bottom) - Math.max(a.box.top, b.box.top)
      if (w > 2 && h > 2) issues.push(`текст на тексте: «${snippet(a.el)}» и «${snippet(b.el)}»`)
    }
  }

  // 5. рамки друг на друге
  const BOXES = '.card, .row, .chip, .btn, .stat, .field, .draft, .option, .theme-card, .seg, .macro, .cal-d, .add-line, .note, .goal-full > div, input, textarea'
  const boxes = all.filter((el) => el.matches(BOXES) && !clippedByScroller(el))
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      if (a.contains(b) || b.contains(a) || layerOf(a) !== layerOf(b)) continue
      const ra = a.getBoundingClientRect()
      const rb = b.getBoundingClientRect()
      const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)
      const h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top)
      if (w > 2 && h > 2) issues.push(`рамки накладываются: «${snippet(a)}» и «${snippet(b)}»`)
    }
  }

  // 6. нижняя панель и кнопка «+» не закрывают текст в конце страницы
  if (!backdrop && opts.atBottom) {
    const fixed = [...document.querySelectorAll('.tabbar, .fab')].map((e) => e.getBoundingClientRect())
    for (const t of textRects) {
      if (t.layer !== 'page') continue
      for (const f of fixed) {
        const w = Math.min(t.box.right, f.right) - Math.max(t.box.left, f.left)
        const h = Math.min(t.box.bottom, f.bottom) - Math.max(t.box.top, f.top)
        if (w > 2 && h > 2) issues.push(`внизу страницы текст «${snippet(t.el)}» закрыт панелью или кнопкой «+»`)
      }
    }
  }
  const fabEl = document.querySelector('.fab')
  const tabEl = document.querySelector('.tabbar')
  if (!backdrop && fabEl && tabEl) {
    const a = fabEl.getBoundingClientRect()
    const b = tabEl.getBoundingClientRect()
    if (a.bottom > b.top + 1) issues.push('кнопка «+» заходит на нижнюю панель')
  }
  return [...new Set(issues)]
}

const text = (t) => (el) => el.textContent.includes(t)
async function clickText(page, selector, t) {
  const ok = await page.evaluate((sel, txt) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(txt))
    if (!el) return false
    el.click()
    return true
  }, selector, t)
  if (!ok) throw new Error(`нет элемента ${selector} с текстом «${t}»`)
}
const pause = (ms = SETTLE_MS) => new Promise((r) => setTimeout(r, ms))
async function typeInto(page, selector, value) {
  await page.focus(selector)
  await page.keyboard.type(value, { delay: 0 })
}

const SCENARIOS = [
  ['дневник, сегодня', async () => {}],
  ['дневник, вчера', async (p) => p.evaluate(() => document.querySelector('.datebar .icon-btn').click())],
  ['из чего сложились калории', async (p) => clickText(p, '.summary', 'Съедено')],
  ['из чего сложились белки', async (p) => clickText(p, '.macro', 'Белки')],
  ['правка продукта', async (p) => p.evaluate(() => document.querySelector('.row').click())],
  ['добавить еду, пусто', async (p) => p.evaluate(() => document.querySelector('.fab').click())],
  ['добавить еду, расчёт', async (p) => {
    await p.evaluate(() => document.querySelector('.fab').click())
    await pause(200)
    await typeInto(p, 'textarea', 'гречка 150 г, куриная грудка 200 г, пицца маргарита 300 г, ложка масла')
    await clickText(p, '.btn', 'Посчитать')
  }],
  ['добавить еду, другая дата', async (p) => {
    await p.evaluate(() => document.querySelector('.fab').click())
    await pause(200)
    await clickText(p, '.chip', 'Вчера')
  }],
  ['добавить тренировку', async (p) => {
    await p.evaluate(() => document.querySelector('.fab').click())
    await pause(200)
    await clickText(p, '.seg button', 'Спорт')
    await typeInto(p, 'textarea', 'бег 40 минут')
    await clickText(p, '.btn', 'Посчитать')
  }],
  ...['Неделя', 'Месяц', '3 месяца', 'Полгода', 'Год', 'Свой период'].map((name) => [`динамика: ${name}`, async (p) => {
    await clickText(p, '.tabbar button', 'Динамика')
    await pause(200)
    await clickText(p, '.chips.periods .chip', name)
  }]),
  ['профиль', async (p) => clickText(p, '.tabbar button', 'Профиль')],
  ['профиль, ключ', async (p) => {
    await clickText(p, '.tabbar button', 'Профиль')
    await pause(200)
    await typeInto(p, 'input[type=password]', 'sk-ant-test-0123456789')
    await clickText(p, '.btn', 'Сохранить ключ')
  }],
]

const WATCHDOG_MS = 10 * 60 * 1000

async function main() {
  setTimeout(() => {
    console.error('Проверка зависла и остановлена по времени')
    process.exit(2)
  }, WATCHDOG_MS).unref()
  const server = await serve()
  console.log('сервер запущен')
  const base = `http://127.0.0.1:${server.address().port}/`
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  console.log('Chrome запущен')
  const problems = []
  let runs = 0
  try {
    const seedPage = await browser.newPage()
    seedPage.setDefaultTimeout(15000)
    await seedPage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    await seedPage.goto(base + '#profile', { waitUntil: 'domcontentloaded' })
    console.log('страница открыта')
    await pause()
    await clickText(seedPage, '.btn', 'Показать пример данных')
    await clickText(seedPage, '.btn', 'Заменить данные примером')
    await pause()
    console.log('пример данных создан')
    const seed = await seedPage.evaluate(() => localStorage.getItem('kbju:v1'))

    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        const page = await browser.newPage()
        page.setDefaultTimeout(15000)
        console.log(`вид ${theme}, ширина ${width}px…`)
        await page.setViewport({ width, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
        const data = JSON.parse(seed)
        data.settings.theme = theme
        data.settings.claudeKey = ''
        await page.evaluateOnNewDocument((json) => localStorage.setItem('kbju:v1', json), JSON.stringify(data))
        await page.evaluateOnNewDocument(() => {
          const style = document.createElement('style')
          style.textContent = '*{animation:none!important;transition:none!important}'
          document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style))
        })
        const errors = []
        page.on('pageerror', (e) => errors.push(String(e)))
        for (const [name, run] of SCENARIOS) {
          await page.goto(base + '#diary', { waitUntil: 'domcontentloaded' })
          await page.reload({ waitUntil: 'domcontentloaded' })
          await pause(250)
          try {
            await run(page)
            await pause(SETTLE_MS)
            const issues = []
            for (const atBottom of [false, true]) {
              if (atBottom) await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
              if (atBottom) await pause(100)
              issues.push(...(await page.evaluate(analyzePage, { atBottom })))
            }
            for (const msg of new Set(issues)) problems.push(`[${theme} ${width}px] ${name}: ${msg}`)
          } catch (e) {
            problems.push(`[${theme} ${width}px] ${name}: сценарий не выполнился — ${e.message}`)
          }
          runs++
        }
        for (const e of errors) problems.push(`[${theme} ${width}px] ошибка в странице: ${e}`)
      }
    }
  } finally {
    browser.process()?.kill('SIGKILL')
    server.close()
  }
  console.log(`Проверено сценариев: ${runs}`)
  if (problems.length) {
    console.log(`Найдено проблем: ${problems.length}`)
    for (const p of problems) console.log(' - ' + p)
    process.exit(1)
  }
  console.log('Вёрстка в порядке: накладок и выходов за край нет.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
