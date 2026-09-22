import { OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'
import { z } from 'zod'

import type { DbClient } from '../../db'
import { validate } from '../../http/product-routes'
import type { AuthHttpEnv } from '../auth'

export const NOTIFICATION_KINDS = ['anchor', 'program', 'evening', 'weekly'] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

export const kindLabels: Record<NotificationKind, string> = {
  anchor: 'Опора дня',
  program: 'Продолжение программы',
  evening: 'Вечернее завершение',
  weekly: 'Недельный обзор',
}

export const kindTexts: Record<NotificationKind, string> = {
  anchor: 'Есть минутка для своего шага?',
  program: 'Шаг твоей программы ждёт, когда будет удобно.',
  evening: 'День потихоньку заканчивается — можно отметить его коротко.',
  weekly: 'Недельный обзор готов: что было посильно и что помогало.',
}

const preferenceInput = z.object({
  kind: z.enum(NOTIFICATION_KINDS),
  enabled: z.boolean(),
  timeMinutes: z.number().int().min(0).max(1439).optional(),
  weekdays: z.array(z.number().int().min(1).max(7)).max(7).optional(),
})

export type NotificationPreferenceDto = z.infer<typeof preferenceInput> & {
  timezone: string
}

/** Настройки напоминаний: преференции + очередь задач доставки. */
export function createNotificationsModule(input: {
  db: DbClient
  requireAuth: MiddlewareHandler<AuthHttpEnv>
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>()
  routes.use('*', input.requireAuth)

  routes.get('/', async (c) => {
    const rows = await input.db.notificationPreference.findMany({
      where: { userId: c.var.user.id },
    })
    const items = NOTIFICATION_KINDS.map((kind) => {
      const row = rows.find((candidate) => candidate.kind === kind)
      return {
        kind,
        enabled: row?.enabled ?? false,
        timeMinutes: row?.timeMinutes ?? defaultTime(kind),
        weekdays: row?.weekdays ?? [1, 2, 3, 4, 5, 6, 7],
      }
    })
    return c.json({ items })
  })

  routes.put('/', validate('json', preferenceInput), async (c) => {
    const { kind, enabled, timeMinutes, weekdays } = c.req.valid('json')
    const userId = c.var.user.id
    const timezone =
      (
        await input.db.userPreferences.findUnique({
          where: { userId },
          select: { timezone: true },
        })
      )?.timezone ?? 'Europe/Moscow'

    await input.db.notificationPreference.upsert({
      where: { userId_kind: { userId, kind } },
      create: {
        userId,
        kind,
        enabled,
        timeMinutes: timeMinutes ?? defaultTime(kind),
        weekdays: weekdays ?? [1, 2, 3, 4, 5, 6, 7],
      },
      update: {
        enabled,
        ...(timeMinutes !== undefined ? { timeMinutes } : {}),
        ...(weekdays !== undefined ? { weekdays } : {}),
      },
    })

    // Задача доставки живёт ровно пока включено напоминание.
    if (enabled) {
      await input.db.notificationJob.upsert({
        where: { id: await jobKey(input.db, userId, kind) },
        create: {
          id: await jobKey(input.db, userId, kind),
          userId,
          kind,
          nextRunAt: nextRunAt(timeMinutes ?? defaultTime(kind), timezone),
          status: 'active',
        },
        update: {
          status: 'active',
          nextRunAt: nextRunAt(timeMinutes ?? defaultTime(kind), timezone),
          lastError: null,
        },
      })
    } else {
      await input.db.notificationJob.updateMany({
        where: { userId, kind },
        data: { status: 'paused' },
      })
    }

    return c.body(null, 204)
  })

  routes.post('/disable-all', async (c) => {
    const userId = c.var.user.id
    await input.db.notificationPreference.updateMany({
      where: { userId },
      data: { enabled: false },
    })
    await input.db.notificationJob.updateMany({
      where: { userId },
      data: { status: 'paused' },
    })
    return c.body(null, 204)
  })

  return { routes }
}

async function jobKey(db: DbClient, userId: string, kind: string): Promise<string> {
  const existing = await db.notificationJob.findFirst({ where: { userId, kind } })
  return existing?.id ?? crypto.randomUUID()
}

function defaultTime(kind: NotificationKind): number {
  if (kind === 'evening') return 21 * 60
  if (kind === 'weekly') return 11 * 60
  return 10 * 60
}

/** Следующий момент запуска по локальному времени пользователя. */
export function nextRunAt(timeMinutes: number, timezone: string): Date {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const todayKey = formatter.format(now)
  for (let offsetDays = 0; offsetDays <= 2; offsetDays += 1) {
    const day = new Date(`${todayKey}T00:00:00Z`)
    day.setUTCDate(day.getUTCDate() + offsetDays)
    const candidate = new Date(day.getTime() + timeMinutes * 60_000)
    if (candidate.getTime() > now.getTime() + 60_000) return candidate
  }
  return new Date(now.getTime() + 24 * 3600_000)
}
