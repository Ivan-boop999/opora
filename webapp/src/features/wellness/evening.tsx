import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { telegram } from '@/platform/telegram'

import { useWellnessApi, localDateKey } from './api'

const rituals: [string, string][] = [
  ['tea', 'Тёплый напиток без спешки'],
  ['light', 'Приглушить свет'],
  ['stretch', 'Мягкая растяжка на минуту'],
  ['music', 'Один спокойный трек'],
  ['note', 'Записать три строчки о дне'],
  ['none', 'Сегодня без ритуала'],
]

/**
 * Вечерний режим: тёплое поле, короткое завершение дня, мысль на завтра и
 * посильный ритуал. Минимум движения и навигации.
 */
export function EveningPage() {
  const api = useWellnessApi()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [doneOne, setDoneOne] = useState('')
  const [tomorrowThought, setTomorrowThought] = useState('')
  const [ritual, setRitual] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const back = () => router.history.back()
  useEffect(() => telegram.onBackButton(back), [])

  const save = useMutation({
    mutationFn: async () => {
      if (doneOne.trim()) {
        await api.createJournal({
          kind: 'structured',
          templateKey: 'supported',
          body: `Завершено сегодня: ${doneOne.trim()}`,
          tags: ['вечер'],
          isDraft: false,
          isFavorite: false,
          dateKey: localDateKey(),
        })
      }
      if (tomorrowThought.trim()) {
        await api.createJournal({
          kind: 'structured',
          templateKey: 'tomorrow',
          body: `Мысль на завтра: ${tomorrowThought.trim()}`,
          tags: ['вечер', 'завтра'],
          isDraft: false,
          isFavorite: false,
          dateKey: localDateKey(),
        })
      }
      if (ritual && ritual !== 'none') {
        await api.startSession({ practiceCode: 'P23', source: 'manual' })
      }
    },
    onSuccess: () => {
      setSaved(true)
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['wellness'] })
      telegram.haptic('soft')
    },
    onError: () => setError('Не удалось сохранить. Проверь соединение и попробуй ещё раз.'),
  })

  if (saved) {
    return (
      <div className="flex min-h-[78dvh] flex-col items-center justify-center gap-5 text-center">
        <div className="animate-grow-in text-5xl" aria-hidden="true">🌙</div>
        <h1 className="font-heading text-[24px] font-bold">Спокойной ночи</h1>
        <p className="max-w-[300px] text-[14.5px] text-muted-foreground">
          День закрыт бережно. Качество сна можно отметить утром на главном экране.
        </p>
        <Button asChild className="h-[52px] w-full max-w-[320px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground">
          <Link to="/app">На главный экран</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 rounded-3xl bg-[linear-gradient(180deg,var(--warm)_0%,var(--background)_45%)] px-1 py-6">
      <header className="text-center">
        <p className="text-[13px] uppercase tracking-wide text-warm-strong">Вечерний режим</p>
        <h1 className="mt-1 font-heading text-[27px] font-bold">Закрыть день тихо</h1>
        <p className="mx-auto mt-2 max-w-[320px] text-[14px] leading-relaxed text-foreground/80">
          Ничего обязательного. Можно заполнить одно поле, два — или сразу сохранить.
        </p>
      </header>

      <div className="card-soft p-4">
        <p className="text-[13.5px] font-medium">Что сегодня получилось?</p>
        <Input
          value={doneOne}
          onChange={(event) => setDoneOne(event.target.value)}
          placeholder="Хоть что-то одно — мелочь считается"
          className="mt-2 h-12 rounded-2xl bg-background text-[15px]"
          maxLength={200}
        />
      </div>

      <div className="card-soft p-4">
        <p className="text-[13.5px] font-medium">Мысль на завтра</p>
        <Textarea
          value={tomorrowThought}
          onChange={(event) => setTomorrowThought(event.target.value)}
          placeholder="К чему вернёшься, если будет желание"
          className="mt-2 min-h-[72px] rounded-2xl bg-background text-[15px]"
          maxLength={500}
        />
      </div>

      <div className="card-soft p-4">
        <p className="text-[13.5px] font-medium">Вечерний ритуал</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {rituals.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={ritual === key}
              className="rounded-full border border-border bg-background px-3.5 py-2 text-[13px] transition-soft data-[on=true]:border-primary"
              data-on={ritual === key}
              style={ritual === key ? { background: 'var(--leaf-soft)', color: 'var(--primary)' } : undefined}
              onClick={() => setRitual(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-[13px] text-destructive" role="alert">{error}</p>
      ) : null}

      <Button
        className="h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
        disabled={save.isPending}
        onClick={() => save.mutate()}
      >
        {save.isPending ? 'Сохраняю…' : 'Завершить день'}
      </Button>
      <p className="text-center text-[12.5px] text-muted-foreground">По твоим отметкам · ничего не отправляется без тебя</p>
    </div>
  )
}

import { Input } from '@/components/ui/input'
