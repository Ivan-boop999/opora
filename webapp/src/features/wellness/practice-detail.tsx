import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { telegram } from '@/platform/telegram'

import { useWellnessApi } from './api'

type Phase = 'card' | 'running' | 'feedback' | 'done'

export function PracticeDetailPage({ code }: { code: string }) {
  const api = useWellnessApi()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('card')
  const [mode, setMode] = useState<'normal' | 'easier'>('normal')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [reward, setReward] = useState<{ dropsGranted: number; totalDrops: number; plantGrewTo: { species: string; stage: number } | null } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const practice = useQuery({
    queryKey: ['wellness', 'practice', code],
    queryFn: () => api.practice(code),
    enabled: Boolean(code),
  })

  const start = useMutation({
    mutationFn: () =>
      api.startSession({ practiceCode: code, mode, source: 'manual' }),
    onSuccess: (data) => {
      setSessionId(data.session.id)
      setPhase('running')
      setError(null)
    },
    onError: () => setError('Не удалось начать. Проверь соединение и попробуй ещё раз.'),
  })

  const complete = useMutation({
    mutationFn: (outcome: 'completed' | 'partial' | 'skipped') =>
      api.completeSession(sessionId!, { outcome }),
    onSuccess: (data) => {
      setPhase('feedback')
      if (data.reward) {
        setReward({
          dropsGranted: data.reward.dropsGranted,
          totalDrops: data.reward.totalDrops,
          plantGrewTo: data.reward.plantGrewTo
            ? { species: data.reward.plantGrewTo.species, stage: data.reward.plantGrewTo.stage }
            : null,
        })
      }
    },
    onError: () => setError('Не удалось сохранить результат — попробуй ещё раз.'),
  })

  const feedback = useMutation({
    mutationFn: (input: { tried: string; effect: string; feasible: string }) =>
      api.leaveFeedback(sessionId!, input),
    onSuccess: () => {
      telegram.haptic('soft')
      setPhase('done')
      queryClient.invalidateQueries({ queryKey: ['wellness'] })
    },
    onError: () => {
      // Отзыв не сохранён, но результат сессии уже учтён — не блокируем выход.
      setPhase('done')
    },
  })

  const back = () => router.history.back()

  useEffect(() => {
    return telegram.onBackButton(phase === 'card' ? null : back)
  }, [phase])

  if (practice.isPending) {
    return <div className="h-72 animate-soft-pulse rounded-3xl bg-surface-2" aria-busy="true" />
  }
  if (practice.isError || !practice.data) {
    return (
      <div className="pt-10 text-center">
        <p className="text-[15px] text-muted-foreground">Карточка не найдена.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/app/practices">К каталогу</Link>
        </Button>
      </div>
    )
  }

  const card = practice.data
  const steps = mode === 'easier' ? [] : card.steps

  if (phase === 'running') {
    return (
      <SessionRunner
        title={card.title}
        steps={steps.length > 0 ? steps : [{ text: card.easierVariant }]}
        stopGuidance={card.stopGuidance}
        onDone={(outcome) => complete.mutate(outcome)}
        pending={complete.isPending}
        error={error}
      />
    )
  }

  if (phase === 'feedback') {
    return (
      <FeedbackForm
        onSubmit={(input) => feedback.mutate(input)}
        pending={feedback.isPending}
      />
    )
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center gap-5 pt-10 text-center">
        <div className="animate-grow-in text-5xl" aria-hidden="true">
          {reward?.plantGrewTo ? '🌱' : '🌿'}
        </div>
        <h1 className="font-heading text-[24px] font-bold">Сохранено</h1>
        <p className="max-w-[300px] text-[14.5px] text-muted-foreground">
          {reward && reward.dropsGranted > 0
            ? `Капель заботы сегодня стало больше (+${reward.dropsGranted}). Всего: ${reward.totalDrops}.`
            : 'Попытка зафиксирована. Частично — тоже результат.'}
        </p>
        {reward?.plantGrewTo ? (
          <p className="rounded-full bg-leaf-soft px-4 py-2 text-[13px] text-primary">
            Растение в саду подросло 🌿
          </p>
        ) : null}
        <div className="flex w-full max-w-[320px] flex-col gap-2">
          <Button asChild className="h-[52px] rounded-2xl bg-primary text-primary-foreground">
            <Link to="/app">На главный экран</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/app/garden">Зайти в сад</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={back}
        className="self-start text-[14px] text-muted-foreground"
        aria-label="Назад"
      >
        ← Назад
      </button>

      <header>
        <p className="text-[12.5px] uppercase tracking-wide text-primary/80">
          {categoryTitle(card.category)}
        </p>
        <h1 className="mt-1 font-heading text-[27px] font-bold leading-tight">{card.title}</h1>
        <p className="mt-1.5 text-[13.5px] text-muted-foreground">
          {card.estimatedMinutes} мин ·{' '}
          {card.effort === 'low' ? 'лёгкое усилие' : 'среднее усилие'} ·{' '}
          {mode === 'easier' ? 'облегчённый вариант' : 'обычный вариант'}
        </p>
      </header>

      <p className="text-[15px] leading-relaxed">{card.summary}</p>

      <ol className="card-soft flex flex-col gap-3 p-5">
        {(mode === 'easier'
          ? [{ text: card.easierVariant }]
          : card.steps.map((step: { text: string }) => ({ text: step.text }))
        ).map((step: { text: string }, index: number) => (
          <li key={index} className="flex gap-3">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-leaf-soft text-[12.5px] font-bold text-primary">
              {index + 1}
            </span>
            <p className="text-[14.5px] leading-relaxed">{step.text}</p>
          </li>
        ))}
      </ol>

      {card.stopGuidance ? (
        <p className="rounded-2xl bg-surface-2/70 px-4 py-3 text-[13px] text-muted-foreground">
          {card.stopGuidance}
        </p>
      ) : null}

      {error ? (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button
          className="h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
          disabled={start.isPending}
          onClick={() => start.mutate()}
        >
          {start.isPending ? 'Начинаю…' : 'Начать'}
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-11 flex-1 rounded-2xl text-[13.5px]"
            onClick={() => setMode(mode === 'normal' ? 'easier' : 'normal')}
          >
            {mode === 'normal' ? 'Сделать проще' : 'Обычный вариант'}
          </Button>
          <Button
            variant="outline"
            className="h-11 flex-1 rounded-2xl text-[13.5px]"
            onClick={() =>
              api
                .setFavorite(card.code, !card.isFavorite)
                .then(() => queryClient.invalidateQueries({ queryKey: ['wellness'] }))
            }
          >
            {card.isFavorite ? 'Убрать из избранного' : 'В избранное'}
          </Button>
        </div>
        <button
          type="button"
          className="mt-1 self-center text-[13px] text-muted-foreground underline-offset-2 hover:underline"
          onClick={() =>
            api
              .setExclusion(card.code, true)
              .then(() => router.history.push('/app/practices'))
          }
        >
          Не показывать эту практику
        </button>
      </div>
    </div>
  )
}

function SessionRunner({
  title,
  steps,
  stopGuidance,
  onDone,
  pending,
  error,
}: {
  title: string
  steps: { text: string }[]
  stopGuidance: string | null
  onDone: (outcome: 'completed' | 'partial' | 'skipped') => void
  pending: boolean
  error: string | null
}) {
  const [current, setCurrent] = useState(0)
  const finished = current >= steps.length

  return (
    <div className="flex min-h-[70dvh] flex-col gap-5 pt-2">
      <p className="text-[12.5px] text-muted-foreground">{title}</p>
      <ol className="flex flex-col gap-3">
        {steps.map((step: { text: string }, index: number) => (
          <li
            key={index}
            className={cn(
              'rounded-2xl border p-4 text-[15px] leading-relaxed transition-soft',
              index < current
                ? 'border-border bg-surface-2/50 text-muted-foreground'
                : index === current
                  ? 'border-primary/40 bg-card'
                  : 'border-transparent bg-surface-2/30 text-muted-foreground/70',
            )}
          >
            {step.text}
          </li>
        ))}
      </ol>

      {stopGuidance && finished ? (
        <p className="text-[13px] text-muted-foreground">{stopGuidance}</p>
      ) : null}

      {error ? (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-auto flex flex-col gap-2 pb-2">
        {!finished ? (
          <>
            <Button
              className="h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
              onClick={() => {
                telegram.haptic('light')
                setCurrent((prev) => prev + 1)
              }}
            >
              {current === 0 ? 'Готов, начинаю' : 'Готово, дальше'}
            </Button>
            <Button
              variant="ghost"
              className="h-11 text-[13.5px] text-muted-foreground"
              onClick={() => onDone('skipped')}
              disabled={pending}
            >
              Остановиться
            </Button>
          </>
        ) : (
          <>
            <Button
              className="h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
              disabled={pending}
              onClick={() => onDone('completed')}
            >
              {pending ? 'Сохраняю…' : 'Получилось'}
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-2xl text-[13.5px]"
              disabled={pending}
              onClick={() => onDone('partial')}
            >
              Частично
            </Button>
            <Button
              variant="ghost"
              className="h-11 text-[13.5px] text-muted-foreground"
              disabled={pending}
              onClick={() => onDone('skipped')}
            >
              Не сейчас
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function FeedbackForm({
  onSubmit,
  pending,
}: {
  onSubmit: (input: { tried: string; effect: string; feasible: string }) => void
  pending: boolean
}) {
  const [tried, setTried] = useState<string | null>(null)
  const [effect, setEffect] = useState<string | null>(null)
  const [feasible, setFeasible] = useState<string | null>(null)

  const ready = tried && effect && feasible

  return (
    <div className="flex flex-col gap-6 pt-4">
      <header>
        <h1 className="font-heading text-[22px] font-bold">Пара вопросов — по желанию</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Отзыв помогает подбирать подходящее. «Не хочу оценивать» — нормальный ответ.
        </p>
      </header>

      <Question
        title="Удалось попробовать?"
        options={[
          ['yes', 'да'],
          ['partial', 'частично'],
          ['no', 'пока нет'],
        ]}
        value={tried}
        onChange={setTried}
      />
      <Question
        title="Как после?"
        options={[
          ['easier', 'легче'],
          ['same', 'так же'],
          ['harder', 'тяжелее'],
          ['declined', 'не хочу оценивать'],
        ]}
        value={effect}
        onChange={setEffect}
      />
      <Question
        title="Это было посильно?"
        options={[
          ['yes', 'да'],
          ['wanted-easier', 'хотелось проще'],
        ]}
        value={feasible}
        onChange={setFeasible}
      />

      <div className="flex flex-col gap-2">
        <Button
          className="h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
          disabled={!ready || pending}
          onClick={() => ready && onSubmit({ tried, effect, feasible })}
        >
          {pending ? 'Сохраняю…' : 'Отправить'}
        </Button>
        <Button variant="ghost" className="h-11 text-[13.5px] text-muted-foreground" disabled={pending} onClick={() => onSubmit({ tried: 'no', effect: 'declined', feasible: 'yes' })}>
          Пропустить
        </Button>
      </div>
    </div>
  )
}

function Question({
  title,
  options,
  value,
  onChange,
}: {
  title: string
  options: [string, string][]
  value: string | null
  onChange: (value: string) => void
}) {
  return (
    <fieldset>
      <legend className="text-[15px] font-semibold">{title}</legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={value === key}
            className={cn(
              'press rounded-full border px-4 py-2 text-[13.5px] transition-soft',
              value === key
                ? 'border-primary bg-primary text-primary-foreground font-medium'
                : 'border-border bg-card text-muted-foreground',
            )}
            onClick={() => onChange(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function categoryTitle(category: string): string {
  const titles: Record<string, string> = {
    grounding: 'Снизить напряжение',
    movement: 'Мягкое движение',
    starting: 'Начать дело',
    rest: 'Отдых и вечер',
    pleasant: 'Приятное и осмысленное',
    connection: 'Связь с людьми',
    attention: 'Внимание и телефон',
    reflection: 'Мысли и рефлексия',
  }
  return titles[category] ?? 'Практика'
}
