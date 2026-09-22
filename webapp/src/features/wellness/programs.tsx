import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useWellnessApi } from './api'

export function ProgramsPage() {
  const api = useWellnessApi()
  const queryClient = useQueryClient()

  const enrollment = useQuery({
    queryKey: ['wellness', 'enrollment'],
    queryFn: () => api.programEnrollment(),
  })

  const day = useMutation({
    mutationFn: (status: 'done' | 'partial' | 'skipped') => api.logProgramDay(status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wellness'] }),
  })

  const control = useMutation({
    mutationFn: (action: 'pause' | 'resume' | 'drop') =>
      action === 'pause' ? api.pauseProgram() : action === 'resume' ? api.resumeProgram() : api.dropProgram(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wellness'] }),
  })

  if (enrollment.isPending) {
    return <div className="h-64 animate-soft-pulse rounded-3xl bg-surface-2" aria-busy="true" />
  }

  const active = enrollment.data?.enrollment ?? null

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-1">
        <h1 className="font-heading text-[26px] font-bold">Программы</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Мягкие последовательности на 7–14 дней. Пропущенный день ничего не обнуляет.
        </p>
      </header>

      {active ? (
        <section aria-label="Активная программа" className="card-soft p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-heading text-[19px] font-semibold">{active.programTitle}</h2>
            <span className="text-[12.5px] text-muted-foreground">
              день {Math.min(active.currentDay, active.daysCount)} / {active.daysCount}
            </span>
          </div>

          <div className="mt-3 flex gap-1" aria-hidden="true">
            {Array.from({ length: active.daysCount }).map((_, index) => {
              const dayNumber = index + 1
              const state = active.completedDays.includes(dayNumber)
                ? 'bg-leaf'
                : dayNumber < active.currentDay
                  ? 'bg-warm'
                  : 'bg-border'
              return <span key={dayNumber} className={cn('h-1.5 flex-1 rounded-full', state)} />
            })}
          </div>

          {active.status === 'completed' || !active.day ? (
            <div className="mt-4">
              <p className="text-[14.5px] leading-relaxed">
                {active.status === 'completed'
                  ? 'Программа завершена. Что попробовано и что сохранилось — видно в наблюдениях.'
                  : 'Программа на паузе — вернёшься, когда будет время.'}
              </p>
              {active.status === 'paused' ? (
                <Button
                  className="mt-3 h-11 rounded-2xl bg-primary text-[14px] text-primary-foreground"
                  onClick={() => control.mutate('resume')}
                >
                  Продолжить
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="mt-4 rounded-2xl bg-surface-2/60 p-4">
                <p className="text-[13px] text-muted-foreground">День {active.day.dayNumber}</p>
                <p className="mt-1 text-[15px] leading-relaxed">{active.day.intro}</p>
                {active.day.question ? (
                  <p className="mt-2 text-[13px] italic text-muted-foreground">
                    Вопрос дня: {active.day.question}
                  </p>
                ) : null}
              </div>

              {active.day.practiceCode ? (
                <Button
                  asChild
                  className="mt-3 h-[52px] w-full rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
                >
                  <Link to="/app/practices/$code" params={{ code: active.day.practiceCode }}>
                    Открыть шаг дня
                  </Link>
                </Button>
              ) : active.day.customStep ? (
                <div className="mt-3 rounded-2xl border border-border p-4">
                  <p className="text-[14.5px] font-semibold">{active.day.customStep.title}</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
                    {active.day.customStep.description}
                  </p>
                </div>
              ) : null}

              <div className="mt-3 flex flex-col gap-2">
                <Button
                  className="h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
                  disabled={day.isPending}
                  onClick={() => day.mutate('done')}
                >
                  {day.isPending ? 'Сохраняю…' : 'Отметить день'}
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="h-11 flex-1 rounded-2xl text-[13px]"
                    disabled={day.isPending}
                    onClick={() => day.mutate('partial')}
                  >
                    Частично
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 flex-1 rounded-2xl text-[13px]"
                    disabled={day.isPending}
                    onClick={() => day.mutate('skipped')}
                  >
                    Пропустить
                  </Button>
                </div>
                <div className="mt-1 flex justify-center gap-4 text-[13px] text-muted-foreground">
                  {active.status === 'active' ? (
                    <button className="underline-offset-2 hover:underline" onClick={() => control.mutate('pause')}>
                      приостановить
                    </button>
                  ) : (
                    <button className="underline-offset-2 hover:underline" onClick={() => control.mutate('resume')}>
                      продолжить
                    </button>
                  )}
                  <button className="underline-offset-2 hover:underline" onClick={() => control.mutate('drop')}>
                    завершить досрочно
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      ) : (
        <ProgramCatalog />
      )}
    </div>
  )
}

function ProgramCatalog() {
  const api = useWellnessApi()
  const queryClient = useQueryClient()
  const [joining, setJoining] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const programs = useQuery({
    queryKey: ['wellness', 'programs'],
    queryFn: () => api.programs(),
  })

  const enroll = useMutation({
    mutationFn: (code: string) => api.enrollProgram(code),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['wellness'] })
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  })

  const items = (programs.data?.items ?? []) as {
    code: string
    title: string
    goal: string
    audience: string
    daysCount: number
  }[]

  return (
    <>
      {error ? (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-2.5">
        {items.map((program) => (
          <li key={program.code} className="card-soft p-4">
            <p className="text-[16px] font-semibold">{program.title}</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">{program.goal}</p>
            <p className="mt-1.5 text-[12.5px] text-muted-foreground">
              {program.daysCount} дней · {program.audience}
            </p>
            <Button
              className="mt-3 h-11 w-full rounded-2xl bg-primary text-[14px] font-medium text-primary-foreground"
              disabled={enroll.isPending && joining === program.code}
              onClick={() => {
                setJoining(program.code)
                enroll.mutate(program.code)
              }}
            >
              Начать
            </Button>
          </li>
        ))}
      </ul>
    </>
  )
}
