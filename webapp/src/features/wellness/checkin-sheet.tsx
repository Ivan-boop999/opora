import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { telegram } from '@/platform/telegram'

import { useWellnessApi } from './api'

const moodLabels = ['тяжело', 'непросто', 'нейтрально', 'неплохо', 'хорошо']
const energyLabels = ['истощён', 'мало сил', 'средне', 'бодро', 'полон сил']
const tensionLabels = ['расслаблен', 'спокоен', 'немного', 'напряжён', 'очень напряжён']

const emotionOptions = [
  'спокойствие',
  'тревога',
  'раздражение',
  'грусть',
  'радость',
  'интерес',
  'пустота',
  'растерянность',
] as const

const contextOptions = [
  ['work', 'работа'],
  ['home', 'дом'],
  ['relationships', 'отношения'],
  ['study', 'учёба'],
  ['loneliness', 'одиночество'],
  ['rest', 'отдых'],
  ['transit', 'дорога'],
] as const

const needOptions = [
  ['calm-down', 'успокоиться'],
  ['move', 'подвигаться'],
  ['start', 'начать'],
  ['rest', 'отдохнуть'],
  ['connect', 'связаться с человеком'],
  ['understand', 'понять состояние'],
] as const

type Scales = {
  mood: number | null
  energy: number | null
  tension: number | null
}

export function CheckInSheet({
  open,
  onOpenChange,
  need,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  need?: string
  onSaved?: () => void
}) {
  const api = useWellnessApi()
  const [scales, setScales] = useState<Scales>({ mood: null, energy: null, tension: null })
  const [emotions, setEmotions] = useState<string[]>([])
  const [context, setContext] = useState<string | null>(null)
  const [needChoice, setNeedChoice] = useState<string | null>(need ?? null)
  const [note, setNote] = useState('')
  const [detailed, setDetailed] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () =>
      api.createCheckIn({
        mood: scales.mood,
        energy: scales.energy,
        tension: scales.tension,
        emotions: emotions.map(toEmotionKey).filter(Boolean) as never,
        context: (context as never) ?? null,
        note: note.trim() ? note.trim() : null,
        need: (needChoice as never) ?? null,
      }),
    onSuccess: () => {
      telegram.haptic('soft')
      onSaved?.()
      onOpenChange(false)
      reset()
    },
    onError: () => {
      setSaveError('Не удалось сохранить. Попробуй ещё раз.')
    },
  })

  function reset() {
    setScales({ mood: null, energy: null, tension: null })
    setEmotions([])
    setContext(null)
    setNeedChoice(null)
    setNote('')
    setDetailed(false)
    setSaveError(null)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[88dvh] max-w-[520px] overflow-y-auto rounded-t-3xl px-5 pb-8 pt-4">
        <SheetHeader className="px-0 text-left">
          <SheetTitle className="font-heading text-[20px]">Как ты сейчас?</SheetTitle>
          <SheetDescription className="text-[13.5px]">
            Отметь, что подходит. Все шкалы независимы — хорошее настроение может сочетаться с
            усталостью.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-5">
          <Scale
            title="Настроение"
            labels={moodLabels}
            value={scales.mood}
            onChange={(mood) => setScales((prev) => ({ ...prev, mood }))}
          />
          <Scale
            title="Энергия"
            labels={energyLabels}
            value={scales.energy}
            onChange={(energy) => setScales((prev) => ({ ...prev, energy }))}
          />
          <Scale
            title="Напряжение"
            labels={tensionLabels}
            value={scales.tension}
            onChange={(tension) => setScales((prev) => ({ ...prev, tension }))}
          />

          {!detailed ? (
            <button
              type="button"
              className="self-start text-[13.5px] text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setDetailed(true)}
            >
              Добавить подробности — по желанию
            </button>
          ) : (
            <div className="flex flex-col gap-5 rounded-2xl bg-surface-2/60 p-4">
              <div>
                <p className="text-[13.5px] font-medium">Что чувствуется?</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {emotionOptions.map((emotion) => (
                    <Chip
                      key={emotion}
                      active={emotions.includes(emotion)}
                      onClick={() =>
                        setEmotions((prev) =>
                          prev.includes(emotion)
                            ? prev.filter((item) => item !== emotion)
                            : [...prev, emotion],
                        )
                      }
                    >
                      {emotion}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[13.5px] font-medium">Контекст</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {contextOptions.map(([key, label]) => (
                    <Chip
                      key={key}
                      active={context === key}
                      onClick={() => setContext(context === key ? null : key)}
                    >
                      {label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[13.5px] font-medium">Чего сейчас хочется?</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {needOptions.map(([key, label]) => (
                    <Chip
                      key={key}
                      active={needChoice === key}
                      onClick={() => setNeedChoice(needChoice === key ? null : key)}
                    >
                      {label}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[13.5px] font-medium">Заметка — можно не писать</p>
                <Textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={2000}
                  placeholder="Пара слов, если хочется…"
                  className="mt-2 min-h-[84px] rounded-2xl bg-card text-[15px]"
                />
              </div>
            </div>
          )}

          {saveError ? (
            <p className="text-[13px] text-destructive" role="alert">
              {saveError}
            </p>
          ) : null}

          <Button
            className="h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
            disabled={save.isPending || (scales.mood === null && scales.energy === null && scales.tension === null && !note.trim())}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Сохраняю…' : 'Сохранить отметку'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Scale({
  title,
  labels,
  value,
  onChange,
}: {
  title: string
  labels: string[]
  value: number | null
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[14.5px] font-semibold">{title}</p>
        <p className="text-[12.5px] text-muted-foreground">
          {value === null ? 'не отмечено' : labels[value - 1]}
        </p>
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={title}>
        {labels.map((label, index) => {
          const level = index + 1
          return (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={value === level}
              aria-label={label}
              className={cn(
                'press h-11 rounded-2xl border text-[13px] transition-soft',
                value === level
                  ? 'border-primary bg-primary text-primary-foreground font-semibold'
                  : 'border-border bg-card text-muted-foreground',
              )}
              onClick={() => onChange(level)}
            >
              {level}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'press rounded-full border px-3.5 py-1.5 text-[13px] transition-soft',
        active
          ? 'border-primary bg-leaf-soft text-primary font-medium'
          : 'border-border bg-card text-muted-foreground',
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function toEmotionKey(label: string): string | undefined {
  const map: Record<string, string> = {
    спокойствие: 'calm',
    тревога: 'anxiety',
    раздражение: 'irritation',
    грусть: 'sadness',
    радость: 'joy',
    интерес: 'interest',
    пустота: 'emptiness',
    растерянность: 'confusion',
  }
  return map[label]
}
