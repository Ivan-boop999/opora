import { useMutation } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { telegram } from '@/platform/telegram'

import { useWellnessApi } from './api'

const reasons: [string, string][] = [
  ['rest', 'отдохнуть'],
  ['distract', 'отвлечься'],
  ['info', 'найти информацию'],
  ['connect', 'связаться с кем-то'],
  ['unknown', 'не знаю'],
]

const alternatives: [string, string, string][] = [
  ['P39', 'Положить телефон на 30 секунд', 'телефон'],
  ['P41', 'Перерыв без ленты', 'взгляд вокруг'],
  ['P28', 'Посмотреть на живое', 'окно'],
  ['P05', 'Минута без следующей задачи', 'пауза'],
]

/**
 * Пауза перед скроллингом: «Зачем я открываю телефон?» → намерение →
 * маленькая альтернатива. Не блокирует ничего — просто возвращает выбор.
 */
export function ScrollPausePage() {
  const api = useWellnessApi()
  const router = useRouter()
  const [reason, setReason] = useState<string | null>(null)
  const [chosen, setChosen] = useState<string | null>(null)

  const back = () => router.history.back()
  useEffect(() => telegram.onBackButton(back), [])

  const finish = useMutation({
    mutationFn: (code: string) => api.startSession({ practiceCode: code, source: 'support' }),
    onSuccess: (_data, code) => {
      telegram.haptic('light')
      router.history.push(`/app/practices/${code}`)
    },
  })

  return (
    <div className="flex min-h-[82dvh] flex-col gap-6 pt-2">
      <button type="button" onClick={back} className="self-start text-[14px] text-muted-foreground">
        ← Закрыть
      </button>

      <header>
        <h1 className="font-heading text-[26px] font-bold">Зачем я открываю телефон?</h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground">
          Просто заметь — ответ не правильный и не неправильный. Это не блокировка и не учёт: выбор
          всегда остаётся твоим.
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Причина">
        {reasons.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={reason === key}
            className={cn(
              'press rounded-full border px-4 py-2.5 text-[14px] transition-soft',
              reason === key
                ? 'border-primary bg-leaf-soft text-primary font-medium'
                : 'border-border bg-card text-muted-foreground',
            )}
            onClick={() => setReason(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {reason ? (
        <section className="card-soft animate-grow-in p-4">
          <p className="text-[14.5px] font-semibold">Маленькая альтернатива</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Если хочется. Можно и просто продолжить с осознанным выбором.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {alternatives.map(([code, title, hint]) => (
              <button
                key={code}
                type="button"
                className={cn(
                  'press flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-soft',
                  chosen === code ? 'border-primary bg-leaf-soft' : 'border-border bg-background',
                )}
                onClick={() => {
                  setChosen(code)
                  finish.mutate(code)
                }}
              >
                <span className="text-[14.5px]">{title}</span>
                <span className="text-[12px] text-muted-foreground">{hint}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-auto pb-2">
        <Button variant="ghost" asChild className="h-11 w-full text-[13.5px] text-muted-foreground">
          <Link to="/app">Просто продолжить день</Link>
        </Button>
      </div>
    </div>
  )
}
