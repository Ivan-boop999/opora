import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { useWellnessApi } from './api'

const categories = [
  ['all', 'Все'],
  ['grounding', 'Снизить напряжение'],
  ['attention', 'Внимание и телефон'],
  ['movement', 'Мягко подвигаться'],
  ['starting', 'Начать дело'],
  ['rest', 'Отдых и вечер'],
  ['pleasant', 'Приятное'],
  ['connection', 'Связь с людьми'],
  ['reflection', 'Разобраться в мыслях'],
] as const

const lengths = [
  ['all', 'Любая'],
  ['3', 'До 3 минут'],
  ['10', 'До 10 минут'],
] as const

export function PracticesPage() {
  const api = useWellnessApi()
  const [category, setCategory] = useState('all')
  const [length, setLength] = useState('all')
  const [search, setSearch] = useState('')

  const query = new URLSearchParams()
  if (category !== 'all') query.set('category', category)
  if (length !== 'all') query.set('minutesMax', length)
  if (search.trim()) query.set('search', search.trim())

  const practices = useQuery({
    queryKey: ['wellness', 'practices', query.toString()],
    queryFn: () => api.practices(Object.fromEntries(query.entries())),
  })

  const items = practices.data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <header className="pt-1">
        <h1 className="font-heading text-[26px] font-bold">Практики</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Короткие посильные действия. Любую можно сделать проще.
        </p>
      </header>

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Поиск по названию или тегу"
        className="h-12 rounded-2xl bg-card text-[15px]"
        inputMode="search"
      />

      <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 no-scrollbar" role="tablist">
        {categories.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={category === key}
            type="button"
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-2 text-[13px] transition-soft',
              category === key
                ? 'border-primary bg-primary text-primary-foreground font-medium'
                : 'border-border bg-card text-muted-foreground',
            )}
            onClick={() => setCategory(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        {lengths.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={length === key}
            className={cn(
              'rounded-full px-3 py-1.5 text-[12.5px] transition-soft',
              length === key ? 'bg-leaf-soft text-primary font-medium' : 'text-muted-foreground',
            )}
            onClick={() => setLength(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {practices.isPending ? (
        <ListSkeleton />
      ) : practices.isError ? (
        <p className="py-8 text-center text-[14px] text-muted-foreground">
          Не удалось загрузить каталог.{' '}
          <button className="text-primary" onClick={() => practices.refetch()}>
            Повторить
          </button>
        </p>
      ) : items.length === 0 && search.trim() ? (
        <div className="py-8 text-center">
          <p className="text-[14.5px] text-muted-foreground">
            По запросу ничего не нашлось — попробуй очистить фильтры.
          </p>
          <button
            className="mt-2 text-[13.5px] text-primary"
            onClick={() => {
              setSearch('')
              setCategory('all')
              setLength('all')
            }}
          >
            Очистить фильтры
          </button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((practice: { code: string; title: string; summary: string; estimatedMinutes: number; effort: string; isFavorite?: boolean; category: string }) => (
            <li key={practice.code}>
              <Link
                to="/app/practices/$code"
                params={{ code: practice.code }}
                className="card-soft press flex items-start justify-between gap-3 p-4 transition-soft"
              >
                <div className="min-w-0">
                  <p className="text-[15.5px] font-semibold leading-snug">{practice.title}</p>
                  <p className="mt-1 line-clamp-2 text-[13.5px] text-muted-foreground">
                    {practice.summary}
                  </p>
                  <p className="mt-1.5 text-[12px] text-muted-foreground">
                    {practice.estimatedMinutes} мин ·{' '}
                    {practice.effort === 'low' ? 'лёгкое' : 'среднее'} усилие
                    {practice.isFavorite ? ' · в избранном' : ''}
                  </p>
                </div>
                <span className="mt-0.5 shrink-0 text-lg" aria-hidden="true">
                  {categoryGlyph(practice.category)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function categoryGlyph(category: string): string {
  switch (category) {
    case 'grounding':
      return '🍃'
    case 'movement':
      return '🌿'
    case 'starting':
      return '🌱'
    case 'rest':
      return '🌙'
    case 'pleasant':
      return '🌸'
    case 'connection':
      return '🫖'
    case 'attention':
      return '📱'
    case 'reflection':
      return '📝'
    default:
      return '•'
  }
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-2.5" aria-busy="true">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="h-20 animate-soft-pulse rounded-3xl bg-surface-2" />
      ))}
    </div>
  )
}
