import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import { useWellnessApi, localDateKey } from './api'

const templates: [string, string][] = [
  ['free', 'Свободная запись'],
  ['thoughts', 'Что сейчас занимает мысли?'],
  ['supported', 'Что сегодня поддержало?'],
  ['drained', 'Что забрало силы?'],
  ['influence', 'На что я могу повлиять?'],
  ['simplify', 'Что можно упростить завтра?'],
  ['moment', 'Небольшой приятный момент'],
]

export function JournalPage() {
  const api = useWellnessApi()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [composing, setComposing] = useState(false)
  const [templateKey, setTemplateKey] = useState('free')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  const entries = useQuery({
    queryKey: ['wellness', 'journal', search],
    queryFn: () => api.journal(search.trim() ? { search: search.trim() } : {}),
  })

  const create = useMutation({
    mutationFn: () =>
      api.createJournal({
        kind: templateKey === 'free' ? 'free' : 'structured',
        templateKey: templateKey === 'free' ? null : templateKey,
        body: body.trim(),
        tags: tags
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 10),
        isDraft: false,
        isFavorite: false,
        dateKey: localDateKey(),
      }),
    onSuccess: () => {
      setComposing(false)
      setBody('')
      setTags('')
      setSaveError(null)
      queryClient.invalidateQueries({ queryKey: ['wellness'] })
    },
    onError: () => setSaveError('Не удалось сохранить. Текст остаётся на экране — попробуй ещё раз.'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteJournal(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wellness'] }),
  })

  const items = entries.data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3 pt-1">
        <div>
          <h1 className="font-heading text-[26px] font-bold">Дневник</h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Здесь появятся твои записи. Можно начать с одной фразы.
          </p>
        </div>
      </header>

      {!composing ? (
        <>
          <Button
            className="h-[52px] rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
            onClick={() => setComposing(true)}
          >
            Новая запись
          </Button>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по записям и тегам"
            className="h-12 rounded-2xl bg-card text-[15px]"
            inputMode="search"
          />
          {entries.isPending ? (
            <div className="h-40 animate-soft-pulse rounded-3xl bg-surface-2" aria-busy="true" />
          ) : entries.isError ? (
            <p className="py-6 text-center text-[14px] text-muted-foreground">
              Не удалось загрузить записи.{' '}
              <button className="text-primary" onClick={() => entries.refetch()}>
                Повторить
              </button>
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-[14px] text-muted-foreground">
              {search.trim() ? 'Ничего не нашлось.' : 'Записей пока нет — и это нормально.'}
            </p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {items.map((entry: { id: string; dateKey: string; templateKey: string | null; body: string; tags: string[]; isFavorite: boolean }) => (
                <li key={entry.id} className="card-soft p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[12.5px] text-muted-foreground">
                      {formatRuDate(entry.dateKey)}
                      {templateTitle(entry.templateKey) ? ` · ${templateTitle(entry.templateKey)}` : ''}
                      {entry.isFavorite ? ' · ♥' : ''}
                    </p>
                    <button
                      type="button"
                      className="text-[12px] text-muted-foreground hover:text-destructive"
                      onClick={() => remove.mutate(entry.id)}
                      aria-label="Удалить запись"
                    >
                      удалить
                    </button>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-[14.5px] leading-relaxed">
                    {entry.body}
                  </p>
                  {entry.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {entry.tags.map((tag: string) => (
                        <span key={tag} className="rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] text-muted-foreground">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 no-scrollbar">
            {templates.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={cn(
                  'shrink-0 rounded-full border px-3.5 py-2 text-[13px] transition-soft',
                  templateKey === key
                    ? 'border-primary bg-primary text-primary-foreground font-medium'
                    : 'border-border bg-card text-muted-foreground',
                )}
                onClick={() => setTemplateKey(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={templatePrompt(templateKey)}
            className="min-h-[180px] rounded-2xl bg-card text-[15px] leading-relaxed"
            maxLength={20000}
            autoFocus
          />
          <Input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="Теги через запятую — необязательно"
            className="h-12 rounded-2xl bg-card text-[14px]"
          />
          {saveError ? (
            <p className="text-[13px] text-destructive" role="alert">
              {saveError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              className="h-[52px] flex-1 rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground"
              disabled={!body.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? 'Сохраняю…' : 'Сохранить'}
            </Button>
            <Button variant="outline" className="h-[52px] rounded-2xl" onClick={() => setComposing(false)}>
              Отмена
            </Button>
          </div>
          <p className="text-[12.5px] text-muted-foreground">
            Дневник не попадает в аналитику продукта. Записи видишь только ты.
          </p>
        </div>
      )}
    </div>
  )
}

function templateTitle(key: string | null): string | null {
  if (!key) return null
  const found = templates.find(([id]) => id === key)
  return found ? found[1] : null
}

function templatePrompt(key: string): string {
  const found = templates.find(([id]) => id === key)
  return found && key !== 'free' ? `${found[1]}\n` : 'Пиши как получается…'
}

function formatRuDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`)
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(date)
}
