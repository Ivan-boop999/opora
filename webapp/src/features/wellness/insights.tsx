import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { cn } from '@/lib/utils'

import { useWellnessApi } from './api'

const periods: [string, string][] = [
  ['7', '7 дней'],
  ['30', '30 дней'],
  ['90', '90 дней'],
  ['all', 'Всё время'],
]

export function InsightsPage() {
  const api = useWellnessApi()
  const [period, setPeriod] = useState('30')

  const insights = useQuery({
    queryKey: ['wellness', 'insights', period],
    queryFn: () => api.insights(period),
  })

  if (insights.isPending) {
    return <div className="h-72 animate-soft-pulse rounded-3xl bg-surface-2" aria-busy="true" />
  }
  if (insights.isError || !insights.data) {
    return (
      <p className="pt-10 text-center text-[14.5px] text-muted-foreground">
        Пока мало отметок. Они появятся здесь, когда захочешь их оставить.
      </p>
    )
  }

  const data = insights.data
  const hasAnything =
    data.checkinDays > 0 || data.actionTotals.total > 0 || data.sleepNights > 0

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-1">
        <h1 className="font-heading text-[26px] font-bold">Мои наблюдения</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">По твоим собственным отметкам.</p>
      </header>

      <div className="flex gap-1.5">
        {periods.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={period === key}
            className={cn(
              'rounded-full border px-3.5 py-2 text-[12.5px] transition-soft',
              period === key
                ? 'border-primary bg-primary text-primary-foreground font-medium'
                : 'border-border bg-card text-muted-foreground',
            )}
            onClick={() => setPeriod(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {!hasAnything ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-[14px] text-muted-foreground">
          Пока мало отметок. Они появятся здесь, когда захочешь их оставить.
        </p>
      ) : (
        <>
          {data.averages ? (
            <section aria-label="Средние оценки" className="card-soft grid grid-cols-3 divide-x divide-border p-4">
              <Average label="Настроение" value={data.averages.mood} />
              <Average label="Энергия" value={data.averages.energy} />
              <Average label="Напряжение" value={data.averages.tension} />
            </section>
          ) : null}

          {data.daily.length > 1 ? (
            <section aria-label="Динамика" className="card-soft p-4">
              <h2 className="text-[14.5px] font-semibold">Динамика настроения</h2>
              <Sparkline
                points={data.daily.map((day: { mood: number | null }) => day.mood)}
                className="mt-3 h-20 w-full"
              />
              <p className="mt-1 text-[12px] text-muted-foreground">
                Дни с отметками: {data.checkinDays}. Каждая точка — среднее за день.
              </p>
            </section>
          ) : null}

          <section aria-label="Действия" className="card-soft p-4">
            <h2 className="text-[14.5px] font-semibold">Действия</h2>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground">
              Полностью: {data.actionTotals.completed} · частично: {data.actionTotals.partial}.
              Частично — тоже результат.
            </p>
            {data.topPractices.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-1.5">
                {data.topPractices.map((practice: { code: string; title: string; times: number }) => (
                  <li key={practice.code} className="flex justify-between text-[13.5px]">
                    <span>{practice.title}</span>
                    <span className="text-muted-foreground">{practice.times} раз</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {data.observations.length > 0 ? (
            <section aria-label="Наблюдения" className="card-soft p-4">
              <h2 className="text-[14.5px] font-semibold">Что помогало</h2>
              <ul className="mt-2 flex flex-col gap-2">
                {data.observations.map((observation: { practiceCode: string; title: string; easierCount: number; ratedCount: number; days: number }) => (
                  <li key={observation.practiceCode} className="text-[13.5px] leading-relaxed">
                    «{observation.title}» — ты отметил «легче» {observation.easierCount} раз из{' '}
                    {observation.ratedCount} оценок (в {observation.days} разных днях).
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[12px] text-muted-foreground">
                Наблюдения показываются от {observationThresholdText()} — это порог удобства, не
                гарантия.
              </p>
            </section>
          ) : null}

          {data.sleepNights > 0 ? (
            <section aria-label="Сон" className="card-soft p-4">
              <h2 className="text-[14.5px] font-semibold">Сон</h2>
              <p className="mt-1.5 text-[13.5px] text-muted-foreground">
                Среднее качество по твоим отметкам: {data.sleepAverage ?? '—'} из 5 (
                {data.sleepNights} ночей).
              </p>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}

function Average({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="px-2 text-center">
      <p className="font-heading text-[22px] font-bold tabular-nums">{value ?? '—'}</p>
      <p className="mt-0.5 text-[11.5px] text-muted-foreground">{label}</p>
    </div>
  )
}

function Sparkline({ points, className }: { points: (number | null)[]; className?: string }) {
  const valid = points.filter((point): point is number => point !== null)
  if (valid.length < 2) return null
  const min = Math.min(...valid)
  const max = Math.max(...valid)
  const span = max - min || 1

  const path = points
    .map((point, index) => {
      if (point === null) return null
      const x = (index / (points.length - 1)) * 100
      const y = 100 - ((point - min) / span) * 80 - 10
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .filter(Boolean)
    .join(' ')

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} role="img" aria-label={`Настроение от ${min} до ${max}`}>
      <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  )
}

function observationThresholdText(): string {
  return '5 оценённых попыток'
}
