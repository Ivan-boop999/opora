import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { telegram } from '@/platform/telegram'

import { useWellnessApi } from './api'
import { GardenMini } from './garden-scene'

const goals = [
  'меньше напряжения',
  'больше повседневной энергии',
  'легче начинать дела',
  'спокойнее завершать день',
  'меньше скроллинга',
  'лучше понимать себя',
  'вернуть приятные занятия',
] as const

const paces: [string, string][] = [
  ['m1-3', '1–3 минуты'],
  ['m5-10', '5–10 минут'],
  ['m10-20', '10–20 минут'],
  ['varied', 'По-разному'],
]

const softLimits = [
  ['seated', 'Предпочитаю сидячие практики'],
  ['no-sound', 'Без звука'],
  ['no-social', 'Без заданий на общение'],
] as const

/**
 * Онбординг из пяти коротких экранов. Прерывается и продолжается; ответы
 * сохраняются в preferences, ничего не сбрасывается при возврате.
 */
export function OnboardingPage() {
  const api = useWellnessApi()
  const queryClient = useQueryClient()
  const preferences = useQuery({ queryKey: ['wellness', 'preferences'], queryFn: () => api.preferences() })

  const [step, setStep] = useState(0)
  const [chosenGoals, setChosenGoals] = useState<string[]>([])
  const [pace, setPace] = useState('varied')
  const [limits, setLimits] = useState<string[]>([])
  const [ageAccepted, setAgeAccepted] = useState(false)
  const [dataAccepted, setDataAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const finish = useMutation({
    mutationFn: async () => {
      await api.updatePreferences({
        pacePreset: pace,
        restrictions: limits,
        onboarding: { goals: chosenGoals, paceChosen: true, privacyAccepted: true },
      })
      await api.grantConsent('age-18', 1)
      await api.grantConsent('data-processing', 1)
      return api.finishOnboarding({ onboarding: { goals: chosenGoals, paceChosen: true, privacyAccepted: true } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wellness'] })
      telegram.haptic('soft')
    },
    onError: () => setError('Не удалось сохранить — проверь соединение и попробуй ещё раз'),
  })

  const steps = [
    <Welcome key="welcome" onNext={() => setStep(1)} onHow={() => setStep(4)} />,
    <GoalsStep
      key="goals"
      chosen={chosenGoals}
      onToggle={(goal) =>
        setChosenGoals((prev) =>
          prev.includes(goal) ? prev.filter((item) => item !== goal) : prev.length < 3 ? [...prev, goal] : prev,
        )
      }
      onNext={() => setStep(2)}
      onSkip={() => setStep(2)}
    />,
    <PaceStep
      key="pace"
      pace={pace}
      limits={limits}
      onPace={setPace}
      onToggleLimit={(limit) =>
        setLimits((prev) =>
          prev.includes(limit) ? prev.filter((item) => item !== limit) : [...prev, limit],
        )
      }
      onNext={() => setStep(3)}
    />,
    <PrivacyStep
      key="privacy"
      ageAccepted={ageAccepted}
      dataAccepted={dataAccepted}
      onAge={() => setAgeAccepted(true)}
      onData={() => setDataAccepted(true)}
      onNext={() => setStep(5)}
      ready={ageAccepted && dataAccepted}
    />,
    <HowItWorks key="how" onNext={() => setStep(1)} />,
    <FirstStep key="first" onFinished={() => finish.mutate()} pending={finish.isPending} error={error} />,
  ]

  const done = finish.isSuccess && preferences.data?.onboardingDone

  if (done) {
    return (
      <div className="flex min-h-[80dvh] flex-col items-center justify-center gap-6 text-center">
        <GardenMini species="sprout" stage={1} />
        <h1 className="font-heading text-[24px] font-bold">Готово — с малого и начнём</h1>
        <p className="max-w-[300px] text-[14.5px] text-muted-foreground">
          Отметь состояние на главном экране и выбери посильный шаг. Сад вырастет сам.
        </p>
        <Button asChild className="h-[52px] w-full max-w-[320px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground">
          <Link to="/app">На главный экран</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-[86dvh] flex-col">
      <div className="flex-1">{steps[step]}</div>
      {step > 0 && step !== 5 ? (
        <button
          type="button"
          className="mx-auto mt-6 text-[13px] text-muted-foreground"
          onClick={() => setStep((prev) => Math.max(0, prev - 1))}
        >
          ← назад
        </button>
      ) : null}
    </div>
  )
}

function Welcome({ onNext, onHow }: { onNext: () => void; onHow: () => void }) {
  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center gap-6 text-center">
      <GardenMini species="sprout" stage={2} />
      <div>
        <h1 className="font-heading text-[32px] font-bold leading-tight">ТвояОпора</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Место, где можно выдохнуть</p>
      </div>
      <p className="max-w-[320px] font-heading text-[19px] font-semibold leading-snug">
        Здесь можно начать с малого
      </p>
      <p className="max-w-[320px] text-[14.5px] leading-relaxed text-muted-foreground">
        Заметь своё состояние, выбери посильный шаг и собери то, что помогает именно тебе.
      </p>
      <div className="flex w-full max-w-[320px] flex-col gap-2">
        <Button
          className="h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
          onClick={onNext}
        >
          Начать
        </Button>
        <Button variant="ghost" className="h-11 text-[13.5px] text-muted-foreground" onClick={onHow}>
          Как это работает
        </Button>
      </div>
    </div>
  )
}

function HowItWorks({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex min-h-[80dvh] flex-col justify-center gap-5">
      <h1 className="font-heading text-[26px] font-bold">Как это работает</h1>
      <ul className="flex flex-col gap-4 text-[14.5px] leading-relaxed">
        <li>Отмечаешь состояние — настроение, энергию, напряжение. Коротко, без диагнозов.</li>
        <li>Приложение предлагает один посильный шаг. Любой можно сделать проще или заменить.</li>
        <li>Забота о себе питает сад — он растёт от действий, а не от идеальных серий.</li>
        <li>Дневник и наблюдения остаются твоими: без рейтингов и сравнений с другими.</li>
      </ul>
      <Button className="h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground" onClick={onNext}>
        Понятно
      </Button>
    </div>
  )
}

function GoalsStep({
  chosen,
  onToggle,
  onNext,
  onSkip,
}: {
  chosen: string[]
  onToggle: (goal: string) => void
  onNext: () => void
  onSkip: () => void
}) {
  return (
    <div className="flex flex-col gap-5 pt-8">
      <h1 className="font-heading text-[26px] font-bold">Для чего ты здесь?</h1>
      <p className="text-[14px] text-muted-foreground">
        Выбери до трёх направлений — или просто посмотри. Выбор влияет на подсказки, но не закрывает
        разделы.
      </p>
      <div className="flex flex-wrap gap-2">
        {goals.map((goal) => (
          <button
            key={goal}
            type="button"
            aria-pressed={chosen.includes(goal)}
            className={cn(
              'press rounded-full border px-4 py-2.5 text-[14px] transition-soft',
              chosen.includes(goal)
                ? 'border-primary bg-leaf-soft text-primary font-medium'
                : 'border-border bg-card text-muted-foreground',
            )}
            onClick={() => onToggle(goal)}
          >
            {goal}
          </button>
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-2 pb-4">
        <Button
          className="h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
          onClick={onNext}
        >
          Дальше
        </Button>
        <Button variant="ghost" className="h-11 text-[13.5px] text-muted-foreground" onClick={onSkip}>
          Пока просто посмотрю
        </Button>
      </div>
    </div>
  )
}

function PaceStep({
  pace,
  limits,
  onPace,
  onToggleLimit,
  onNext,
}: {
  pace: string
  limits: string[]
  onPace: (pace: string) => void
  onToggleLimit: (limit: string) => void
  onNext: () => void
}) {
  return (
    <div className="flex flex-col gap-5 pt-8">
      <h1 className="font-heading text-[26px] font-bold">Посильный темп</h1>
      <p className="text-[14px] text-muted-foreground">
        Сколько времени комфортно выделять? Это предпочтение, а не норма на каждый день.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {paces.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={pace === key}
            className={cn(
              'rounded-2xl border px-4 py-3.5 text-[14px] transition-soft',
              pace === key
                ? 'border-primary bg-leaf-soft text-primary font-semibold'
                : 'border-border bg-card text-muted-foreground',
            )}
            onClick={() => onPace(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div>
        <p className="text-[13.5px] font-medium">Необязательные ограничения</p>
        <div className="mt-2 flex flex-col gap-2">
          {softLimits.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={limits.includes(key)}
              className={cn(
                'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-[14px] transition-soft',
                limits.includes(key)
                  ? 'border-primary bg-leaf-soft text-primary'
                  : 'border-border bg-card text-muted-foreground',
              )}
              onClick={() => onToggleLimit(key)}
            >
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-md border',
                  limits.includes(key) ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                )}
                aria-hidden="true"
              >
                {limits.includes(key) ? '✓' : ''}
              </span>
              {label}
            </button>
          ))}
        </div>
      </div>
      <Button
        className="mt-auto h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
        onClick={onNext}
      >
        Дальше
      </Button>
    </div>
  )
}

function PrivacyStep({
  ageAccepted,
  dataAccepted,
  onAge,
  onData,
  onNext,
  ready,
}: {
  ageAccepted: boolean
  dataAccepted: boolean
  onAge: () => void
  onData: () => void
  onNext: () => void
  ready: boolean
}) {
  return (
    <div className="flex flex-col gap-5 pt-8">
      <h1 className="font-heading text-[26px] font-bold">Приватность</h1>
      <p className="text-[14.5px] leading-relaxed text-muted-foreground">
        Сохраняются: твои отметки состояния, выполненные практики, записи дневника и прогресс сада.
        Мы не спрашиваем телефон, имя, дату рождения и диагнозы.
      </p>
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        Дневник не попадает в продуктовую аналитику. Страна для ресурсов помощи выбирается вручную
        в настройках.
      </p>
      <div className="flex flex-col gap-2">
        <Consent
          checked={ageAccepted}
          onToggle={onAge}
          label="Мне 18 лет или больше"
        />
        <Consent
          checked={dataAccepted}
          onToggle={onData}
          label="Согласен на обработку своих отметок и записей для работы приложения"
        />
      </div>
      <Button
        className="mt-auto h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
        disabled={!ready}
        onClick={onNext}
      >
        Дальше
      </Button>
    </div>
  )
}

function Consent({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      className={cn(
        'flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left text-[14px] leading-relaxed transition-soft',
        checked ? 'border-primary bg-leaf-soft text-primary' : 'border-border bg-card',
      )}
      onClick={onToggle}
    >
      <span
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border',
          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
        )}
        aria-hidden="true"
      >
        {checked ? '✓' : ''}
      </span>
      {label}
    </button>
  )
}

function FirstStep({
  onFinished,
  pending,
  error,
}: {
  onFinished: () => void
  pending: boolean
  error: string | null
}) {
  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center gap-6 text-center">
      <GardenMini species="sprout" stage={1} />
      <h1 className="font-heading text-[26px] font-bold">Первый шаг — сразу</h1>
      <p className="max-w-[320px] text-[14.5px] leading-relaxed text-muted-foreground">
        Растение и напоминания можно выбрать потом. Сначала — одно короткое действие.
      </p>
      {error ? (
        <p className="text-[13px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex w-full max-w-[320px] flex-col gap-2">
        <Button
          className="h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
          disabled={pending}
          onClick={onFinished}
        >
          {pending ? 'Сохраняю…' : 'Хорошо'}
        </Button>
      </div>
    </div>
  )
}
