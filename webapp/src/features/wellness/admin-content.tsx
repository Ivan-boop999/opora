import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth'

/**
 * Контентная админка владельца: статус карточек, программы, ресурсы помощи и
 * обезличенная статистика. Согласована с продуктом, но удобна с ПК.
 */

type AdminApi = ReturnType<typeof useAuth>['transport']['request']

function useAdminApi() {
  const { transport } = useAuth()
  return transport.request as AdminApi
}

const statusLabels: Record<string, string> = {
  draft: 'черновик',
  published: 'опубликовано',
  retired: 'снято',
}

export function AdminContentPage() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-heading text-[24px] font-bold">Содержание</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          Карточки, программы и ресурсы помощи. Публикация — явное действие; изменения пишутся в
          журнал.
        </p>
      </header>
      <StatsBlock />
      <PracticesBlock />
      <ResourcesBlock />
    </div>
  )
}

function StatsBlock() {
  const request = useAdminApi()
  const stats = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => request('/api/admin/content/stats', statsSchema),
  })
  if (stats.isPending || stats.isError) return null
  const s = stats.data
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-[15px] font-semibold">Обезличенные показатели</h2>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center sm:grid-cols-5">
        {[
          ['Пользователи', s.users],
          ['Отметки', s.checkIns],
          ['Сессии', s.sessions],
          ['Записи дневника', s.journal],
          ['Активные программы', s.activePrograms],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl bg-surface-2/60 px-2 py-3">
            <p className="text-[20px] font-bold tabular-nums">{String(value)}</p>
            <p className="text-[11.5px] text-muted-foreground">{String(label)}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

import { z } from 'zod'
const statsSchema = z.custom<{
  users: number
  sessions: number
  checkIns: number
  journal: number
  activePrograms: number
}>(() => true)
const practicesSchema = z.custom<{ items: { id: string; title: string; reviewStatus: string; practice: { code: string } }[] }>(() => true)
const resourcesSchema = z.custom<{
  items: { id: string; country: string; title: string; orgUrl: string; status: string; verifiedAt: string | null }[]
}>(() => true)

function PracticesBlock() {
  const request = useAdminApi()
  const queryClient = useQueryClient()
  const practices = useQuery({
    queryKey: ['admin', 'practices'],
    queryFn: () => request('/api/admin/content/practices', practicesSchema),
  })
  const setStatus = useMutation({
    mutationFn: (input: { code: string; status: string }) =>
      request(`/api/admin/content/practices/${input.code}/status`, z.custom(() => true) as never, {
        method: 'PATCH',
        body: { status: input.status },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  })

  const items = practices.data?.items ?? []
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-[15px] font-semibold">Карточки ({items.length})</h2>
      <ul className="mt-2 flex max-h-[420px] flex-col divide-y divide-border overflow-y-auto">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[14px]">
                {item.practice.code} · {item.title}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {statusLabels[item.reviewStatus] ?? item.reviewStatus}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              {item.reviewStatus !== 'published' ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg text-[12px]"
                  onClick={() => setStatus.mutate({ code: item.practice.code, status: 'published' })}
                >
                  Опубликовать
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg text-[12px]"
                  onClick={() => setStatus.mutate({ code: item.practice.code, status: 'draft' })}
                >
                  В черновики
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ResourcesBlock() {
  const request = useAdminApi()
  const queryClient = useQueryClient()
  const resources = useQuery({
    queryKey: ['admin', 'resources'],
    queryFn: () => request('/api/admin/content/resources', resourcesSchema),
  })
  const [form, setForm] = useState({ country: 'RU', title: '', orgUrl: '', contact: '' })
  const create = useMutation({
    mutationFn: () =>
      request('/api/admin/content/resources', z.custom(() => true) as never, {
        method: 'POST',
        body: {
          country: form.country.toUpperCase().slice(0, 2),
          title: form.title.trim(),
          orgUrl: form.orgUrl.trim(),
          contacts: [{ label: 'Телефон/ссылка', value: form.contact.trim() }],
          status: 'draft',
        },
      }),
    onSuccess: () => {
      setForm({ country: form.country, title: '', orgUrl: '', contact: '' })
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })
  const setStatus = useMutation({
    mutationFn: (input: { id: string; status: string; verified: boolean }) =>
      request(`/api/admin/content/resources/${input.id}`, z.custom(() => true) as never, {
        method: 'PATCH',
        body: { status: input.status, verified: input.verified },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  })

  const items = resources.data?.items ?? []
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h2 className="text-[15px] font-semibold">Ресурсы помощи ({items.length})</h2>
      <ul className="mt-2 flex flex-col divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[14px]">
                {item.country} · {item.title}
              </p>
              <p className="text-[12px] text-muted-foreground">
                {statusLabels[item.status] ?? item.status}
                {item.verifiedAt ? ' · проверено' : ' · не проверено'}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-lg text-[12px]"
                onClick={() => setStatus.mutate({ id: item.id, status: 'published', verified: true })}
              >
                Проверить и открыть
              </Button>
              {item.status === 'published' ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg text-[12px]"
                  onClick={() => setStatus.mutate({ id: item.id, status: 'draft', verified: false })}
                >
                  Скрыть
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-surface-2/50 p-3">
        <p className="text-[13px] font-medium">Добавить ресурс (черновиком)</p>
        <div className="grid grid-cols-[70px_1fr] gap-2">
          <Input
            value={form.country}
            onChange={(event) => setForm({ ...form, country: event.target.value })}
            placeholder="RU"
            className="h-10 rounded-xl bg-background text-[13px]"
          />
          <Input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Название службы"
            className="h-10 rounded-xl bg-background text-[13px]"
          />
        </div>
        <Input
          value={form.orgUrl}
          onChange={(event) => setForm({ ...form, orgUrl: event.target.value })}
          placeholder="Официальный источник (URL)"
          className="h-10 rounded-xl bg-background text-[13px]"
        />
        <Input
          value={form.contact}
          onChange={(event) => setForm({ ...form, contact: event.target.value })}
          placeholder="Телефон или контакт"
          className="h-10 rounded-xl bg-background text-[13px]"
        />
        <Button
          className="h-10 rounded-xl bg-primary text-[13px] text-primary-foreground"
          disabled={!form.title.trim() || !form.orgUrl.trim() || !form.contact.trim() || create.isPending}
          onClick={() => create.mutate()}
        >
          {create.isPending ? 'Сохраняю…' : 'Добавить черновик'}
        </Button>
        <p className="text-[11.5px] text-muted-foreground">
          Публикация — отдельное действие после сверки контактов с источником.
        </p>
      </div>
    </section>
  )
}
