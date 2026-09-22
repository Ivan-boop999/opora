import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { MobileSupportLink } from '@/app/shell'
import { useWellnessApi } from './api'
import { CheckInSheet } from './checkin-sheet'
import { GardenMini } from './garden-scene'

const greetings: Record<string, { hi: string; sub: string }> = {
  morning: { hi: 'Доброе утро', sub: 'Как начинается день?' },
  day: { hi: 'Добрый день', sub: 'Как идут дела?' },
  evening: { hi: 'Хороший вечер', sub: 'День уже потихоньку заканчивается' },
  night: { hi: 'Тихой ночи', sub: 'Вечер ещё здесь, если нужно' },
}

const stateOptions = [
  { key: 'strong', label: 'Есть силы', need: 'start' },
  { key: 'usual', label: 'Обычный день', need: 'understand' },
  { key: 'tired', label: 'Устал', need: 'rest' },
  { key: 'tense', label: 'Напряжён', need: 'calm-down' },
  { key: 'unclear', label: 'Трудно понять', need: 'understand' },
] as const

export function TodayPage() {
  const api = useWellnessApi()
  const queryClient = useQueryClient()
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [checkInNeed, setCheckInNeed] = useState<string | undefined>()

  const today = useQuery({ queryKey: ['wellness', 'today'], queryFn: () => api.today() })

  if (today.isPending) {
    return <TodaySkeleton />
  }
  if (today.isError) {
    return (
      <div className="pt-8 text-center">
        <p className="text-[15px] text-muted-foreground">
          Не получилось загрузить день. Проверь соединение.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => today.refetch()}>
          Попробовать ещё раз
        </Button>
      </div>
    )
  }

  const data = today.data
  const greeting = greetings[data.greetingPeriod] ?? greetings.day
  const dateLabel = formatRuDate(data.dateKey)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] capitalize text-muted-foreground">{dateLabel}</p>
          <h1 className="mt-0.5 font-heading text-[28px] font-bold leading-tight">{greeting.hi}</h1>
          <p className="mt-1 text-[14.5px] text-muted-foreground">{greeting.sub}</p>
        </div>
        <MobileSupportLink />
      </header>

      {/* Карточка состояния */}
      <section aria-label="Отметка состояния" className="card-soft relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-leaf-soft/70 blur-2xl" />
        <h2 className="font-heading text-[19px] font-semibold">
          {data.checkInToday ? 'Сегодня уже отмечено' : 'Как ты сейчас?'}
        </h2>
        {data.checkInToday ? (
          <CheckInReflection today={data.checkInToday} onOpen={() => setCheckInOpen(true)} />
        ) : (
          <>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Отметь состояние — подберём посильный шаг.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {stateOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className="press rounded-full border border-border bg-background px-4 py-2.5 text-[14px] transition-soft hover:border-primary/40"
                  onClick={() => {
                    setCheckInNeed(option.need)
                    setCheckInOpen(true)
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Главная рекомендация */}
      {data.recommendation ? (
        <section aria-label="Рекомендация" className="card-soft p-5">
          <p className="text-[12.5px] font-medium uppercase tracking-wide text-primary/80">
            Посильный шаг
          </p>
          <h2 className="mt-1.5 font-heading text-[21px] font-semibold leading-snug">
            {data.recommendation.practice.title}
          </h2>
          <p className="mt-1 text-[13.5px] text-muted-foreground">
            {data.recommendation.practice.estimatedMinutes} мин ·{' '}
            {data.recommendation.practice.effort === 'low' ? 'лёгкое усилие' : 'среднее усилие'}
          </p>
          <p className="mt-2.5 text-[14.5px] leading-relaxed text-foreground/90">
            {data.recommendation.practice.summary}
          </p>
          <p className="mt-1.5 text-[13px] italic text-muted-foreground">
            {data.recommendation.reason}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              asChild
              className="h-[52px] flex-1 rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
            >
              <Link
                to="/app/practices/$code"
                params={{ code: data.recommendation.practice.code }}
              >
                Попробовать
              </Link>
            </Button>
            <Button
              variant="outline"
              className="h-[52px] rounded-2xl text-[14px]"
              onClick={() => today.refetch()}
            >
              Другой вариант
            </Button>
          </div>
          {data.recommendation.alternatives.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {data.recommendation.alternatives.slice(0, 2).map((practice: { code: string; title: string; estimatedMinutes: number }) => (
                <Link
                  key={practice.code}
                  to="/app/practices/$code"
                  params={{ code: practice.code }}
                  className="rounded-full bg-surface-2 px-3 py-1.5 text-[12.5px] text-muted-foreground transition-soft hover:text-foreground"
                >
                  Или: {practice.title}
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Активная программа */}
      {data.activeProgram && data.activeProgram.status !== 'completed' ? (
        <Link
          to="/app/programs"
          className="card-soft press flex items-center justify-between gap-3 p-4 transition-soft"
        >
          <div>
            <p className="text-[12.5px] text-muted-foreground">Программа</p>
            <p className="mt-0.5 text-[15.5px] font-semibold">{data.activeProgram.programTitle}</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              День {data.activeProgram.currentDay} из {data.activeProgram.daysCount}
              {data.activeProgram.status === 'paused' ? ' · на паузе' : ''}
            </p>
          </div>
          <span className="text-2xl" aria-hidden="true">
            🌿
          </span>
        </Link>
      ) : null}

      {/* Опоры дня */}
      <section aria-label="План дня">
        <div className="flex items-baseline justify-between">
          <h2 className="font-heading text-[17px] font-semibold">Опоры дня</h2>
          <Link to="/app/me" className="text-[13px] text-primary">
            настроить
          </Link>
        </div>
        {data.routineAnchors.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-border px-4 py-3.5 text-[13.5px] text-muted-foreground">
            Можно выбрать одну опору на день — или оставить день свободным.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {data.routineAnchors.slice(0, 3).map((routine: { id: string; title: string; timeOfDay: string; todayStatus: string | null; practiceCode: string | null }) => (
              <li
                key={routine.id}
                className="card-soft flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14.5px] font-medium">{routine.title}</p>
                  <p className="text-[12.5px] text-muted-foreground">
                    {timeOfDayLabel(routine.timeOfDay)}
                    {routine.todayStatus === 'done' ? ' · сделано' : ''}
                    {routine.todayStatus === 'partial' ? ' · частично' : ''}
                    {routine.todayStatus === 'skipped' ? ' · пропущено' : ''}
                  </p>
                </div>
                {routine.practiceCode ? (
                  <Link
                    to="/app/practices/$code"
                    params={{ code: routine.practiceCode }}
                    className="shrink-0 rounded-full bg-leaf-soft px-3 py-1.5 text-[12.5px] font-medium text-primary"
                  >
                    Открыть
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Сад */}
      {data.gardenVisible && data.gardenSummary ? (
        <Link
          to="/app/garden"
          className="card-soft press flex items-center gap-4 overflow-hidden p-4 transition-soft"
        >
          <GardenMini
            species={data.gardenSummary.plantSpecies ?? 'sprout'}
            stage={data.gardenSummary.plantStage ?? 1}
          />
          <div>
            <p className="text-[14.5px] font-semibold">Сад</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Капель заботы сегодня: {data.gardenSummary.todayDrops} · всего{' '}
              {data.gardenSummary.totalDrops}
            </p>
          </div>
        </Link>
      ) : null}

      {/* Избранное */}
      {data.favorites.length > 0 ? (
        <section aria-label="Избранное">
          <h2 className="font-heading text-[17px] font-semibold">Твоё избранное</h2>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {data.favorites.map((practice: { code: string; title: string; estimatedMinutes: number }) => (
              <Link
                key={practice.code}
                to="/app/practices/$code"
                params={{ code: practice.code }}
                className="card-soft w-[170px] shrink-0 p-3.5 transition-soft"
              >
                <p className="text-[14px] font-semibold leading-snug">{practice.title}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {practice.estimatedMinutes} мин
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <CheckInSheet
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
        need={checkInNeed}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['wellness'] })
        }}
      />
    </div>
  )
}

function CheckInReflection({
  today,
  onOpen,
}: {
  today: NonNullable<ReturnType<typeof Object>> & {
    mood: number | null
    energy: number | null
    tension: number | null
  }
  onOpen: () => void
}) {
  const lines: string[] = []
  if (today.energy !== null && today.energy <= 2) lines.push('Сегодня бережный темп')
  else if (today.tension !== null && today.tension >= 4) lines.push('Можно выбрать спокойный шаг')
  else if (today.mood !== null && today.mood >= 4) lines.push('Можно выбрать чуть больше движения')
  else lines.push('Спасибо за отметку')
  return (
    <div className="mt-2 flex items-end justify-between gap-3">
      <div>
        <p className="text-[15px] leading-relaxed">{lines[0]}</p>
        <button
          type="button"
          onClick={onOpen}
          className="mt-1 text-[13px] text-primary underline-offset-2 hover:underline"
        >
          Добавить ещё отметку
        </button>
      </div>
      <div className="flex gap-1.5" aria-hidden="true">
        <ScaleDot value={today.mood} />
        <ScaleDot value={today.energy} />
        <ScaleDot value={today.tension} />
      </div>
    </div>
  )
}

function ScaleDot({ value }: { value: number | null }) {
  const tone =
    value === null ? 'bg-border' : value >= 4 ? 'bg-leaf' : value >= 3 ? 'bg-warm' : 'bg-lavender'
  return <span className={`size-2.5 rounded-full ${tone}`} />
}

function TodaySkeleton() {
  return (
    <div className="flex flex-col gap-5 pt-2" aria-busy="true" aria-label="Загрузка">
      <div className="h-8 w-40 animate-soft-pulse rounded-lg bg-surface-2" />
      <div className="h-40 animate-soft-pulse rounded-3xl bg-surface-2" />
      <div className="h-56 animate-soft-pulse rounded-3xl bg-surface-2" />
    </div>
  )
}

function formatRuDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`)
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

function timeOfDayLabel(value: string): string {
  if (value === 'morning') return 'утро'
  if (value === 'evening') return 'вечер'
  return 'день'
}
