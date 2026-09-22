import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/features/auth'
import { cn } from '@/lib/utils'

import { useWellnessApi } from './api'

const timezoneOptions = [
  'Europe/Moscow',
  'Europe/Kaliningrad',
  'Europe/Samara',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Novosibirsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Europe/Kyiv',
  'Europe/Minsk',
  'Asia/Almaty',
  'Asia/Tashkent',
  'UTC',
]

const countryOptions: [string, string][] = [
  ['RU', 'Россия'],
  ['KZ', 'Казахстан'],
  ['BY', 'Беларусь'],
  ['UA', 'Украина'],
  ['other', 'Другая'],
]

export function MePage() {
  const api = useWellnessApi()
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const { theme, setTheme } = useTheme()
  const [notice, setNotice] = useState<string | null>(null)

  const preferences = useQuery({ queryKey: ['wellness', 'preferences'], queryFn: () => api.preferences() })

  const update = useMutation({
    mutationFn: (patch: Record<string, unknown>) => api.updatePreferences(patch),
    onSuccess: () => {
      setNotice('Сохранено')
      queryClient.invalidateQueries({ queryKey: ['wellness'] })
    },
    onError: () => setNotice('Не удалось сохранить — попробуй ещё раз'),
  })

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 2200)
    return () => clearTimeout(timer)
  }, [notice])

  const prefs = preferences.data?.preferences

  return (
    <div className="flex flex-col gap-6">
      <header className="pt-1">
        <h1 className="font-heading text-[26px] font-bold">Я</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          {user?.displayName ?? 'Твои настройки и данные'}
        </p>
      </header>

      {notice ? <p className="text-[13px] text-primary" role="status">{notice}</p> : null}

      <section aria-label="Статистика" className="card-soft p-4">
        <Link to="/app/insights" className="flex items-center justify-between">
          <div>
            <p className="text-[15.5px] font-semibold">Мои наблюдения</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Отметки, действия и осторожные выводы
            </p>
          </div>
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      <section aria-label="Оформление" className="flex flex-col gap-3">
        <h2 className="font-heading text-[16.5px] font-semibold">Оформление</h2>
        <div className="card-soft flex gap-1 p-1.5">
          {[
            ['light', 'Светлая'],
            ['dark', 'Тёмная'],
            ['system', 'Системная'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={cn(
                'flex-1 rounded-xl py-2.5 text-[13.5px] transition-soft',
                theme === key ? 'bg-leaf-soft font-semibold text-primary' : 'text-muted-foreground',
              )}
              onClick={() => {
                setTheme(key)
                update.mutate({ theme: key })
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {preferences.isPending || !prefs ? null : (
        <>
          <section aria-label="Ритм" className="flex flex-col gap-3">
            <h2 className="font-heading text-[16.5px] font-semibold">Ритм и формат</h2>
            <div className="card-soft flex flex-col gap-4 p-4">
              <label className="flex items-center justify-between gap-3">
                <span className="text-[14.5px]">Часовой пояс</span>
                <select
                  value={prefs.timezone}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-[13.5px]"
                  onChange={(event) => update.mutate({ timezone: event.target.value })}
                >
                  {timezoneOptions.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-[14.5px]">Страна для ресурсов помощи</span>
                <select
                  value={prefs.country ?? ''}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-[13.5px]"
                  onChange={(event) => update.mutate({ country: event.target.value || null })}
                >
                  <option value="">Не выбрана</option>
                  {countryOptions.map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <SettingRow
                label="Показывать сад и награды"
                checked={prefs.gamificationVisible}
                onChange={(checked) => update.mutate({ gamificationVisible: checked })}
              />
              <SettingRow
                label="Меньше анимаций"
                checked={prefs.reduceMotion}
                onChange={(checked) => update.mutate({ reduceMotion: checked })}
              />
            </div>
          </section>

          <section aria-label="Приватность" className="flex flex-col gap-2">
            <h2 className="font-heading text-[16.5px] font-semibold">Данные</h2>
            <p className="rounded-2xl bg-surface-2/60 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
              Отметки, записи дневника и прогресс хранятся в твоём аккаунте. Дневник не попадает в
              аналитику. Удаление аккаунта стирает данные и останавливает напоминания.
            </p>
            <Button
              variant="outline"
              className="h-11 rounded-2xl text-[13.5px] text-destructive"
              onClick={async () => {
                if (!window.confirm('Удалить все записи дневника? Это нельзя отменить.')) return
                await api.deleteAllJournal()
                queryClient.invalidateQueries({ queryKey: ['wellness'] })
                setNotice('Дневник очищен')
              }}
            >
              Удалить все записи дневника
            </Button>
          </section>
        </>
      )}

      <section aria-label="О сервисе" className="flex flex-col gap-2">
        <h2 className="font-heading text-[16.5px] font-semibold">О сервисе</h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          ТвояОпора — помощник повседневной заботы о себе. Это не медицинская услуга и не замена
          специалисту. Приложение не измеряет дофамин и не ставит диагнозов.
        </p>
      </section>

      <Button variant="ghost" className="h-11 text-[13.5px] text-muted-foreground" onClick={() => logout()}>
        Выйти
      </Button>
    </div>
  )
}

function SettingRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[14.5px]">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}
