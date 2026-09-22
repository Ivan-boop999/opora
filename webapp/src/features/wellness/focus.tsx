import { useMutation } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { telegram } from '@/platform/telegram'

import { useWellnessApi } from './api'

const durations = [5, 10, 15, 25] as const

/**
 * Фокус-сессия с честным таймером: остаток считается от временных отметок, а не
 * setInterval. Сворачивание не рушит состояние, пауза не сжигает остаток, а
 * завершение требует действия пользователя.
 */
export function FocusPage() {
  const api = useWellnessApi()
  const [intention, setIntention] = useState('')
  const [minutes, setMinutes] = useState<number>(10)
  const [customMinutes, setCustomMinutes] = useState('')
  const [session, setSession] = useState<{ id: string; plannedMinutes: number; startedAt: number } | null>(null)
  const [pausedAccumulated, setPausedAccumulated] = useState(0)
  const [pausedAt, setPausedAt] = useState<number | null>(null)
  const [, forceTick] = useState(0)
  const finishedRef = useRef(false)

  const start = useMutation({
    mutationFn: () =>
      api.startFocus({
        intention: intention.trim(),
        plannedMinutes: customMinutes ? Math.min(180, Math.max(1, Number(customMinutes))) : minutes,
      }),
    onSuccess: (data) => {
      setSession({
        id: data.focus.id,
        plannedMinutes: data.focus.plannedMinutes,
        startedAt: Date.now(),
      })
      setPausedAccumulated(0)
      setPausedAt(null)
      finishedRef.current = false
      telegram.expand()
    },
  })

  const finish = useMutation({
    mutationFn: (status: 'completed' | 'stopped') => {
      if (pausedAt !== null) void api.focusMark(session!.id, { at: new Date(pausedAt).toISOString(), type: 'pause' })
      return api.finishFocus(session!.id, status)
    },
    onSuccess: () => {
      setSession(null)
      setIntention('')
      setCustomMinutes('')
    },
  })

  const elapsed = useMemo(() => {
    if (!session) return 0
    const active = (pausedAt ?? Date.now()) - session.startedAt
    return Math.max(0, Math.round((active - pausedAccumulated) / 1000))
  }, [session, pausedAccumulated, pausedAt, forceTick as never])

  useEffect(() => {
    if (!session) return
    const timer = setInterval(() => forceTick((value) => value + 1), 500)
    return () => clearInterval(timer)
  }, [session])

  if (!session) {
    const effective = customMinutes ? Math.min(180, Math.max(1, Number(customMinutes) || 1)) : minutes
    return (
      <div className="flex flex-col gap-5">
        <header className="pt-1">
          <h1 className="font-heading text-[26px] font-bold">Фокус</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Одно намерение и тихий отрезок времени. «Только начать» — тоже вариант.
          </p>
        </header>

        <div className="card-soft p-5">
          <label className="text-[13.5px] font-medium" htmlFor="focus-intention">
            Что хочешь сделать?
          </label>
          <Input
            id="focus-intention"
            value={intention}
            onChange={(event) => setIntention(event.target.value)}
            placeholder="Одним коротким предложением…"
            className="mt-2 h-12 rounded-2xl bg-background text-[15px]"
            maxLength={200}
          />

          <p className="mt-4 text-[13.5px] font-medium">Сколько времени?</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {durations.map((option) => (
              <button
                key={option}
                type="button"
                className={cn(
                  'rounded-full border px-4 py-2 text-[13.5px] transition-soft',
                  !customMinutes && minutes === option
                    ? 'border-primary bg-primary text-primary-foreground font-medium'
                    : 'border-border bg-background text-muted-foreground',
                )}
                onClick={() => {
                  setMinutes(option)
                  setCustomMinutes('')
                }}
              >
                {option} мин
              </button>
            ))}
            <button
              type="button"
              className={cn(
                'rounded-full border px-4 py-2 text-[13.5px] transition-soft',
                effective === 2 && customMinutes
                  ? 'border-primary bg-primary text-primary-foreground font-medium'
                  : 'border-border bg-background text-muted-foreground',
              )}
              onClick={() => setCustomMinutes('2')}
            >
              Только начать · 2 мин
            </button>
          </div>
          <Input
            value={customMinutes}
            onChange={(event) => setCustomMinutes(event.target.value.replace(/\D/g, ''))}
            placeholder="Или своё: минут"
            inputMode="numeric"
            className="mt-2 h-11 rounded-2xl bg-background text-[14px]"
          />
        </div>

        <Button
          className="h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
          disabled={!intention.trim() || start.isPending}
          onClick={() => start.mutate()}
        >
          {start.isPending ? 'Начинаю…' : `Начать · ${effective} мин`}
        </Button>
      </div>
    )
  }

  const total = session.plannedMinutes * 60
  const remaining = Math.max(0, total - elapsed)
  const progress = Math.min(1, elapsed / total)
  const done = remaining === 0 && pausedAt === null

  useEffect(() => {
    if (done && !finishedRef.current) {
      finishedRef.current = true
      telegram.notify('success')
    }
  }, [done])

  return (
    <div className="flex min-h-[72dvh] flex-col items-center justify-center gap-8">
      <p className="max-w-[300px] text-center text-[15px] leading-relaxed text-muted-foreground">
        {intention}
      </p>

      <div className="relative flex size-56 items-center justify-center" role="timer" aria-label={`Осталось ${formatClock(remaining)}`}>
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="5" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 45}
            strokeDashoffset={2 * Math.PI * 45 * (1 - progress)}
            className="transition-soft"
          />
        </svg>
        <div className="text-center">
          <p className="font-heading text-[40px] font-bold tabular-nums">{formatClock(remaining)}</p>
          <p className="text-[12.5px] text-muted-foreground">
            {pausedAt !== null ? 'на паузе' : done ? 'время вышло' : 'идёт'}
          </p>
        </div>
      </div>

      <div className="flex w-full max-w-[320px] flex-col gap-2">
        {pausedAt === null ? (
          <Button
            variant="outline"
            className="h-[52px] rounded-2xl text-[14.5px]"
            onClick={() => {
              setPausedAt(Date.now())
              void api.focusMark(session.id, { at: new Date().toISOString(), type: 'pause' })
            }}
          >
            Пауза
          </Button>
        ) : (
          <Button
            className="h-[52px] rounded-2xl bg-primary text-[14.5px] font-semibold text-primary-foreground"
            onClick={() => {
              if (pausedAt !== null) {
                setPausedAccumulated((prev) => prev + (Date.now() - pausedAt))
                setPausedAt(null)
                void api.focusMark(session.id, { at: new Date().toISOString(), type: 'resume' })
              }
            }}
          >
            Продолжить
          </Button>
        )}
        <Button
          variant="ghost"
          className="h-11 text-[13.5px] text-muted-foreground"
          disabled={finish.isPending}
          onClick={() => finish.mutate('stopped')}
        >
          Остановиться
        </Button>
        {done ? (
          <Button
            className="h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
            disabled={finish.isPending}
            onClick={() => finish.mutate('completed')}
          >
            {finish.isPending ? 'Сохраняю…' : 'Завершить'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}
