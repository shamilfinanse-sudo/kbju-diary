import { useRef, useState } from 'react'
import { ConfirmButton } from '../components/ConfirmButton'
import { NumField } from '../components/NumField'
import { createInitial, parseBackup, setProfile, setSettings, setTargets } from '../lib/data'
import { demoData } from '../lib/demo'
import { ACTIVITY_LEVELS, calcTargets, GOALS } from '../lib/norms'
import { useStore } from '../store'
import type { AppData, Goal, Profile as ProfileData, Sex, ThemeId } from '../lib/types'

const THEMES: Array<{ id: ThemeId; label: string; hint: string; colors: string[] }> = [
  { id: 'mint', label: 'Мята', hint: 'мягкие панели', colors: ['#b9cbc5', '#eef1ed', '#d98f55'] },
  { id: 'neo', label: 'Нео', hint: 'выпуклые карточки', colors: ['#e4e7ed', '#f2a33a', '#5b7bb0'] },
  { id: 'forest', label: 'Лес', hint: 'зелёный и коричневый', colors: ['#1d4a3c', '#e8c39e', '#a8d5a2'] },
]

const DEFAULT_PROFILE: ProfileData = { sex: 'm', age: 30, heightCm: 175, weightKg: 75, activity: 1.375, goal: 'keep' }

export function Profile() {
  const { data, update, saved } = useStore()
  const profile = data.profile ?? DEFAULT_PROFILE
  const targets = data.targets
  const [keyDraft, setKeyDraft] = useState(data.settings.claudeKey)
  const [message, setMessage] = useState('')
  const [pendingImport, setPendingImport] = useState<AppData | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const changeProfile = (patch: Partial<ProfileData>) => {
    const next = { ...profile, ...patch }
    update((d) => setProfile(d, next, d.settings.customTargets && d.targets ? d.targets : calcTargets(next)))
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `kbju-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function readBackup(file: File) {
    try {
      setPendingImport(parseBackup(await file.text()))
      setMessage('')
    } catch (e) {
      setPendingImport(null)
      setMessage(e instanceof Error ? e.message : 'Не получилось прочитать файл')
    }
  }

  return (
    <div className="screen">
      {!saved ? <div className="note warn">В этом режиме браузер не сохраняет данные. Для постоянной работы откройте приложение по обычной ссылке.</div> : null}

      <section className="card">
        <h3>Вид приложения</h3>
        <div className="themes">
          {THEMES.map((t) => (
            <button key={t.id} className={`theme-card${data.settings.theme === t.id ? ' on' : ''}`} onClick={() => update((d) => setSettings(d, { theme: t.id }))}>
              <span className="swatches">
                {t.colors.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              <b>{t.label}</b>
              <small>{t.hint}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h3>Ваши данные</h3>
        <div className="seg">
          {(['m', 'f'] as Sex[]).map((s) => (
            <button key={s} className={profile.sex === s ? 'on' : ''} onClick={() => changeProfile({ sex: s })}>
              {s === 'm' ? 'Мужчина' : 'Женщина'}
            </button>
          ))}
        </div>
        <div className="grid3">
          <NumField label="Возраст" value={profile.age} onChange={(n) => changeProfile({ age: n })} suffix="лет" />
          <NumField label="Рост" value={profile.heightCm} onChange={(n) => changeProfile({ heightCm: n })} suffix="см" />
          <NumField label="Вес" value={profile.weightKg} onChange={(n) => changeProfile({ weightKg: n })} suffix="кг" decimals />
        </div>
        <div className="hint">Активность без учёта тренировок — их вы вносите отдельно</div>
        <div className="options">
          {ACTIVITY_LEVELS.map((a) => (
            <button key={a.value} className={`option${profile.activity === a.value ? ' on' : ''}`} onClick={() => changeProfile({ activity: a.value })}>
              <b>{a.label}</b>
              <small>{a.hint}</small>
            </button>
          ))}
        </div>
        <div className="seg">
          {GOALS.map((g) => (
            <button key={g.value} className={profile.goal === g.value ? 'on' : ''} onClick={() => changeProfile({ goal: g.value as Goal })}>
              {g.label}
            </button>
          ))}
        </div>
        {!data.profile ? (
          <button className="btn primary" onClick={() => changeProfile({})}>
            Рассчитать мою норму
          </button>
        ) : null}
      </section>

      {targets ? (
        <section className="card stack">
          <h3>Дневная норма</h3>
          <div className="grid2">
            <NumField label="Калории" value={targets.kcal} onChange={(n) => update((d) => setTargets(d, { ...targets, kcal: n }, true))} suffix="ккал" />
            <NumField label="Белки" value={targets.p} onChange={(n) => update((d) => setTargets(d, { ...targets, p: n }, true))} suffix="г" />
            <NumField label="Жиры" value={targets.f} onChange={(n) => update((d) => setTargets(d, { ...targets, f: n }, true))} suffix="г" />
            <NumField label="Углеводы" value={targets.c} onChange={(n) => update((d) => setTargets(d, { ...targets, c: n }, true))} suffix="г" />
          </div>
          <div className="hint">{data.settings.customTargets ? 'Нормы заданы вручную.' : 'Рассчитано по формуле Миффлина — Сан-Жеора с учётом цели.'}</div>
          {data.settings.customTargets ? (
            <button className="btn" onClick={() => update((d) => setTargets(d, calcTargets(profile), false))}>
              Пересчитать по моим данным
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="card stack">
        <h3>Ключ Claude</h3>
        <div className="hint">Нужен для продуктов, которых нет в базе, и необычных тренировок. Хранится только в этом телефоне.</div>
        <input type="password" autoComplete="off" placeholder="sk-ant-…" value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} />
        <button
          className="btn"
          onClick={() => {
            update((d) => setSettings(d, { claudeKey: keyDraft.trim() }))
            setMessage(keyDraft.trim() ? 'Ключ сохранён' : 'Ключ удалён')
          }}
        >
          Сохранить ключ
        </button>
      </section>

      <section className="card stack">
        <h3>Данные</h3>
        <div className="hint">Всё хранится только на этом телефоне. Скачайте копию, чтобы не потерять записи при смене телефона.</div>
        <button className="btn" onClick={exportData}>
          Скачать копию
        </button>
        <button className="btn" onClick={() => fileRef.current?.click()}>
          Загрузить копию
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && readBackup(e.target.files[0])} />
        {pendingImport ? (
          <ConfirmButton
            ask="Точно заменить? Нажмите ещё раз"
            onConfirm={() => {
              update(() => pendingImport)
              setPendingImport(null)
              setMessage('Копия загружена')
            }}
          >
            Заменить данные файлом ({pendingImport.entries.length} записей еды)
          </ConfirmButton>
        ) : null}
        <ConfirmButton ask="Заменить данные примером? Нажмите ещё раз" onConfirm={() => update(() => ({ ...demoData(), settings: data.settings }))}>
          Показать пример данных
        </ConfirmButton>
        <ConfirmButton danger ask="Удалить всё? Нажмите ещё раз" onConfirm={() => update(() => createInitial())}>
          Очистить всё
        </ConfirmButton>
        {message ? <div className="note">{message}</div> : null}
      </section>
    </div>
  )
}
