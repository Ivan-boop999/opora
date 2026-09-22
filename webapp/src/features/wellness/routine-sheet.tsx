import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { useWellnessApi } from './api'

const timesOfDay: [string, string][] = [
  ['morning', 'Утро'],
  ['day', 'День'],
  ['evening', 'Вечер'],
]

/** Создание личной опоры дня: из каталога или своим коротким действием. */
export function RoutineSheet({
  open,
  onOpenChange,
  practiceCode,
  practiceTitle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  practiceCode?: string
  practiceTitle?: string
}) {
  const api = useWellnessApi()
  const queryClient = useQueryClient()
  const [timeOfDay, setTimeOfDay] = useState('day')
  const [title, setTitle] = useState('')
  const [steps, setSteps] = useState('')
  const [error, setError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () =>
      api.createRoutine({
        title: practiceTitle ?? title.trim(),
        practiceCode: practiceCode ?? null,
        customSteps: practiceCode ? null : steps.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 5).map((text) => ({ text })),
        timeOfDay,
        optional: true,
      }),
    onSuccess: () => {
      onOpenChange(false)
      setTitle('')
      setSteps('')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['wellness'] })
    },
    onError: () => setError('Не удалось сохранить — попробуй ещё раз'),
  })

  const valid = Boolean(practiceTitle) || (title.trim().length > 0 && steps.trim().length > 0)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[80dvh] max-w-[520px] overflow-y-auto rounded-t-3xl px-5 pb-8 pt-4">
        <SheetHeader className="px-0 text-left">
          <SheetTitle className="font-heading text-[20px]">Новая опора дня</SheetTitle>
          <SheetDescription className="text-[13.5px]">
            Одна–три опоры — уже хороший план. Опору можно выполнить, перенести или пропустить без
            вины.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-4">
          {practiceTitle ? (
            <div className="rounded-2xl bg-leaf-soft/60 px-4 py-3 text-[14.5px]">
              {practiceTitle}
            </div>
          ) : (
            <>
              <div>
                <label className="text-[13.5px] font-medium" htmlFor="routine-title">
                  Название
                </label>
                <Input
                  id="routine-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Например: минута тишины с чаем"
                  className="mt-1.5 h-12 rounded-2xl bg-background text-[15px]"
                  maxLength={120}
                />
              </div>
              <div>
                <label className="text-[13.5px] font-medium" htmlFor="routine-steps">
                  Шаги (каждый с новой строки)
                </label>
                <Textarea
                  id="routine-steps"
                  value={steps}
                  onChange={(event) => setSteps(event.target.value)}
                  placeholder={'Налить чай\nПосидеть минуту без телефона'}
                  className="mt-1.5 min-h-[84px] rounded-2xl bg-background text-[15px]"
                />
              </div>
            </>
          )}

          <div>
            <p className="text-[13.5px] font-medium">Время дня</p>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {timesOfDay.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={cn(
                    'rounded-2xl border py-2.5 text-[13.5px] transition-soft',
                    timeOfDay === key
                      ? 'border-primary bg-leaf-soft text-primary font-semibold'
                      : 'border-border bg-card text-muted-foreground',
                  )}
                  onClick={() => setTimeOfDay(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <p className="text-[13px] text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            className="h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
            disabled={!valid || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? 'Сохраняю…' : 'Добавить опору'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
