import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'

import { telegram } from '@/platform/telegram'

import { useWellnessApi } from './api'
import { useAuth } from '@/features/auth'

const paths = [
  {
    key: 'overwhelm',
    title: 'Слишком много напряжения',
    hint: 'Одно короткое действие, чтобы чуть ослабить натиск.',
    practice: 'P01',
    practiceLabel: 'Один предмет рядом',
  },
  {
    key: 'thoughts',
    title: 'Мысли не останавливаются',
    hint: 'Мягкая опора для внимания.',
    practice: 'P04',
    practiceLabel: 'Вернуться в комнату',
  },
  {
    key: 'stuck',
    title: 'Ничего не могу начать',
    hint: 'Самый маленький первый шаг.',
    practice: 'P13',
    practiceLabel: 'Только первый шаг',
  },
  {
    key: 'wait',
    title: 'Хочется просто переждать',
    hint: 'Переждать — тоже способ. Вот спокойный на это взгляд.',
    practice: 'P22',
    practiceLabel: 'Отдых без плана улучшения',
  },
  {
    key: 'person',
    title: 'Нужен человек',
    hint: 'Короткое сообщение без требования ответа.',
    practice: 'P31',
    practiceLabel: 'Короткое сообщение',
  },
] as const

/**
 * Быстрая поддержка: ни анкет, ни условий. Каждая дорожка — одна карточка,
 * возможность остановиться и доступ к человеческой помощи.
 */
export function SupportPage() {
  const api = useWellnessApi()
  const { user } = useAuth()

  const back = () => window.history.back()
  useEffect(() => telegram.onBackButton(back), [])

  return (
    <div className="flex flex-col gap-5">
      <button type="button" onClick={back} className="self-start text-[14px] text-muted-foreground">
        ← Назад
      </button>
      <header>
        <h1 className="font-heading text-[26px] font-bold">Нужна поддержка</h1>
        <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
          Здесь можно не выбирать и не объяснять. Одна карточка на каждое состояние — и живые
          контакты, если хочется человека.
        </p>
      </header>

      <ul className="flex flex-col gap-2.5">
        {paths.map((path) => (
          <li key={path.key}>
            <Link
              to="/app/practices/$code"
              params={{ code: path.practice }}
              className="card-soft press block p-4 transition-soft"
            >
              <p className="text-[16px] font-semibold">{path.title}</p>
              <p className="mt-1 text-[13.5px] text-muted-foreground">{path.hint}</p>
              <p className="mt-2 inline-block rounded-full bg-leaf-soft px-3 py-1.5 text-[12.5px] font-medium text-primary">
                {path.practiceLabel} · 1–2 мин
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <HumanHelp user={user} api={api} />

      <p className="rounded-2xl bg-surface-2/60 px-4 py-3.5 text-[12.5px] leading-relaxed text-muted-foreground">
        Если есть непосредственная опасность — звони в местную службу экстренной помощи (в России:
        112). Это приложение не отслеживает кризисы и не заменяет специалиста.
      </p>
    </div>
  )
}

function HumanHelp({
  user,
  api,
}: {
  user: { displayName?: string | null } | null
  api: ReturnType<typeof useWellnessApi>
}) {
  const resources = useQuery({
    queryKey: ['wellness', 'support'],
    queryFn: () => api.supportResources(),
  })
  const items = (resources.data?.items ?? []) as {
    title: string
    orgUrl: string
    contacts: { label: string; value: string }[]
    hours: string | null
  }[]

  return (
    <section aria-label="Живая помощь">
      <h2 className="font-heading text-[17px] font-semibold">Поговорить с человеком</h2>
      {items.length === 0 ? (
        <p className="mt-2 rounded-2xl border border-dashed border-border px-4 py-4 text-[13.5px] leading-relaxed text-muted-foreground">
          Для выбранной страны пока нет проверенных ресурсов — мы не показываем непроверенные
          контакты. Обратись к близкому человеку или к своему специалисту, если он есть.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {items.map((resource) => (
            <li key={resource.title} className="card-soft p-4">
              <p className="text-[15px] font-semibold">{resource.title}</p>
              {resource.contacts.map((contact) => (
                <p key={contact.value} className="mt-1 text-[14px] text-primary">
                  {contact.value}
                  <span className="ml-1.5 text-[12px] text-muted-foreground">{contact.label}</span>
                </p>
              ))}
              {resource.hours ? (
                <p className="mt-1 text-[12.5px] text-muted-foreground">{resource.hours}</p>
              ) : null}
              <button
                type="button"
                className="mt-1.5 text-[13px] text-primary underline-offset-2 hover:underline"
                onClick={() => telegram.openLink(resource.orgUrl)}
              >
                Официальный источник
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[12.5px] text-muted-foreground">
        {user?.displayName ? `${user.displayName}, ` : ''}ты можешь просто переждать здесь — выходить
        никуда не обязательно.
      </p>
    </section>
  )
}
