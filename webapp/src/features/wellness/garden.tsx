import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { telegram } from '@/platform/telegram'

import { useWellnessApi } from './api'
import { GardenScene, speciesLabels, type SceneVariant, type Species } from './garden-scene'

const speciesUnlock = [
  { species: 'sprout' as Species, at: 0 },
  { species: 'fern' as Species, at: 10 },
  { species: 'bush' as Species, at: 24 },
  { species: 'blossom' as Species, at: 40 },
  { species: 'succulent' as Species, at: 64 },
  { species: 'tree' as Species, at: 96 },
]

const scenes: [SceneVariant, string][] = [
  ['day', 'День'],
  ['dawn', 'Рассвет'],
  ['dusk', 'Вечер'],
]

export function GardenPage() {
  const api = useWellnessApi()
  const queryClient = useQueryClient()
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; name: string | null; slot: number } | null>(null)

  const garden = useQuery({ queryKey: ['wellness', 'garden'], queryFn: () => api.garden() })

  const plant = useMutation({
    mutationFn: (species: Species) => api.plant(species),
    onSuccess: () => {
      telegram.haptic('soft')
      setNotice(null)
      queryClient.invalidateQueries({ queryKey: ['wellness'] })
    },
    onError: (error: Error) => {
      setNotice(error.message || 'Не получилось посадить растение.')
    },
  })

  const setScene = useMutation({
    mutationFn: (scene: SceneVariant) => api.setScene(scene),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wellness'] }),
  })

  if (garden.isPending) {
    return <div className="h-80 animate-soft-pulse rounded-3xl bg-surface-2" aria-busy="true" />
  }
  if (garden.isError || !garden.data) {
    return (
      <div className="pt-10 text-center">
        <p className="text-[15px] text-muted-foreground">Сад не загрузился.</p>
        <Button variant="outline" className="mt-4" onClick={() => garden.refetch()}>
          Попробовать ещё раз
        </Button>
      </div>
    )
  }

  const data = garden.data
  type Plant = { id: string; species: string; stage: number; slot: number; name: string | null }
  const freeSlots = 8 - data.plants.length

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-1">
        <h1 className="font-heading text-[26px] font-bold">Сад</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Растёт от капель заботы — за любые небольшие действия. Пропуски ничего не отнимают.
        </p>
      </header>

      <div className="card-soft overflow-hidden">
        <GardenScene
          plants={(data.plants as Plant[]).map((item: Plant) => ({ species: item.species, stage: item.stage, slot: item.slot }))}
          variant={data.scene}
          className="h-auto w-full"
        />
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <div className="text-[13px] text-muted-foreground">
            Сегодня: <span className="font-semibold text-foreground">{data.todayDrops} / 4</span> капель
            {' · '}
            всего {data.totalDrops}
          </div>
          <div className="flex gap-1">
            {scenes.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={data.scene === key}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[12px] transition-soft',
                  data.scene === key
                    ? 'bg-leaf-soft text-primary font-medium'
                    : 'text-muted-foreground',
                )}
                onClick={() => setScene.mutate(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {data.plants.length === 0 ? (
        <div className="card-soft p-5 text-center">
          <p className="text-[15px]">Первый росток уже здесь — он появится после первой отметки или практики.</p>
          <p className="mt-1 text-[13px] text-muted-foreground">Он останется с тобой и после пауз.</p>
        </div>
      ) : (
        <section aria-label="Растения">
          <h2 className="font-heading text-[17px] font-semibold">Растения</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {(data.plants as Plant[]).map((item: Plant) => (
              <li
                key={item.id}
                className="card-soft flex items-center justify-between gap-3 p-4"
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setEditing({ id: item.id, name: item.name, slot: item.slot })}
                >
                  <p className="truncate text-[15px] font-medium">{item.name ?? (speciesLabels as Record<string, string>)[item.species] ?? 'Растение'}</p>
                  <p className="text-[12.5px] text-muted-foreground">
                    Стадия {item.stage} из 5 · место {item.slot + 1} · изменить
                  </p>
                </button>
                <div className="flex gap-1" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span
                      key={index}
                      className={cn(
                        'h-1.5 w-4 rounded-full',
                        index < item.stage ? 'bg-leaf' : 'bg-border',
                      )}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.nextGrowthAt !== null ? (
        <p className="rounded-2xl bg-surface-2/60 px-4 py-3 text-[13px] text-muted-foreground">
          Следующая стадия — при {data.nextGrowthAt} капель заботы (сейчас {data.totalDrops}).
        </p>
      ) : (
        <p className="rounded-2xl bg-surface-2/60 px-4 py-3 text-[13px] text-muted-foreground">
          Все стадии выращены. Сад можно просто навещать.
        </p>
      )}

      <section aria-label="Коллекция">
        <h2 className="font-heading text-[17px] font-semibold">Коллекция</h2>
        {notice ? (
          <p className="mt-2 text-[13px] text-destructive" role="alert">
            {notice}
          </p>
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-2">
          {speciesUnlock.map((item) => {
            const unlocked = (data.unlockedSpecies as string[]).includes(item.species)
            const owned = (data.plants as Plant[]).some((plantItem: Plant) => plantItem.species === item.species)
            return (
              <button
                key={item.species}
                type="button"
                disabled={!unlocked || freeSlots <= 0}
                className={cn(
                  'card-soft press p-3.5 text-left transition-soft',
                  (!unlocked || freeSlots <= 0) && 'opacity-60',
                )}
                onClick={() => plant.mutate(item.species)}
              >
                <p className="text-[13.5px] font-medium">{(speciesLabels as Record<string, string>)[item.species] ?? 'Растение'}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {unlocked
                    ? owned
                      ? 'уже растёт'
                      : 'посадить в свободное место'
                    : `откроется при ${item.at} капель`}
                </p>
              </button>
            )
          })}
        </div>
      </section>

      {editing ? (
        <section aria-label="Редактирование растения" className="card-soft flex flex-col gap-3 p-4">
          <p className="text-[14.5px] font-semibold">Растение</p>
          <Input
            value={editing.name ?? ''}
            onChange={(event) => setEditing({ ...editing, name: event.target.value })}
            placeholder="Имя растения — необязательно"
            className="h-11 rounded-2xl bg-background text-[14.5px]"
            maxLength={40}
          />
          <div>
            <p className="text-[12.5px] text-muted-foreground">Место в саду</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {Array.from({ length: 8 }).map((_, slot) => (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={editing.slot === slot}
                  className={cn(
                    'size-9 rounded-xl border text-[13px] transition-soft',
                    editing.slot === slot
                      ? 'border-primary bg-leaf-soft text-primary font-semibold'
                      : 'border-border bg-card text-muted-foreground',
                  )}
                  onClick={() => setEditing({ ...editing, slot })}
                >
                  {slot + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="h-11 flex-1 rounded-2xl bg-primary text-[14px] text-primary-foreground"
              onClick={() => {
                void api
                  .updatePlant(editing.id, { name: editing.name?.trim() || null, slot: editing.slot })
                  .then(() => {
                    setEditing(null)
                    queryClient.invalidateQueries({ queryKey: ['wellness'] })
                  })
              }}
            >
              Сохранить
            </Button>
            <Button variant="outline" className="h-11 rounded-2xl" onClick={() => setEditing(null)}>
              Отмена
            </Button>
          </div>
        </section>
      ) : null}

      {data.achievements.length > 0 ? (
        <section aria-label="Достижения">
          <h2 className="font-heading text-[17px] font-semibold">Заметки о заботе</h2>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {data.achievements.map((achievement: { key: string }) => (
              <li
                key={achievement.key}
                className="rounded-full bg-leaf-soft px-3.5 py-1.5 text-[12.5px] text-primary"
              >
                {achievementLabel(achievement.key)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function achievementLabel(key: string): string {
  const labels: Record<string, string> = {
    'first-step': 'Первый шаг сделан',
    'tried-easier': 'Попробовал облегчение',
    'saved-favorite': 'Сохранил подходящую практику',
    'returned-after-pause': 'Вернулся после перерыва',
    'finished-program': 'Завершил программу в своём темпе',
    'seven-kind-days': 'Семь дней заботы',
  }
  return labels[key] ?? key
}
