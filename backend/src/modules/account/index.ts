import { OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'

import type { DbClient } from '../../db'
import { validate } from '../../http/product-routes'
import type { AuthHttpEnv } from '../auth'
import { z } from 'zod'

/**
 * Данные владельца: честный экспорт всего его аккаунта одним JSON и полное
 * удаление аккаунта (каскад по всем продуктовым таблицам, включая задачи
 * напоминаний — им не по кому больше стрелять).
 */
export function createAccountModule(input: {
  db: DbClient
  requireAuth: MiddlewareHandler<AuthHttpEnv>
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>()
  routes.use('*', input.requireAuth)

  routes.get('/export', async (c) => {
    const userId = c.var.user.id
    const db = input.db
    const [
      checkIns,
      sessions,
      feedback,
      favorites,
      exclusions,
      routines,
      occurrences,
      enrollments,
      dayLogs,
      focus,
      sleep,
      journal,
      garden,
      plants,
      rewards,
      achievements,
      notificationPreferences,
    ] = await Promise.all([
      db.checkIn.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      db.practiceSession.findMany({ where: { userId }, orderBy: { startedAt: 'asc' } }),
      db.practiceFeedback.findMany({
        where: { session: { userId } },
        orderBy: { createdAt: 'asc' },
      }),
      db.practiceFavorite.findMany({ where: { userId } }),
      db.practiceExclusion.findMany({ where: { userId } }),
      db.routine.findMany({ where: { userId } }),
      db.routineOccurrence.findMany({ where: { userId } }),
      db.programEnrollment.findMany({ where: { userId } }),
      db.programDayLog.findMany({ where: { enrollment: { userId } } }),
      db.focusSession.findMany({ where: { userId } }),
      db.sleepEntry.findMany({ where: { userId } }),
      db.journalEntry.findMany({ where: { userId } }),
      db.garden.findFirst({ where: { userId } }),
      db.gardenPlant.findMany({ where: { garden: { userId } } }),
      db.rewardLedger.findMany({ where: { userId } }),
      db.achievement.findMany({ where: { userId } }),
      db.notificationPreference.findMany({ where: { userId } }),
    ])

    const payload = {
      exportedAt: new Date().toISOString(),
      format: 'opora-export-v1',
      checkIns,
      practiceSessions: sessions,
      practiceFeedback: feedback,
      favorites,
      exclusions,
      routines,
      routineOccurrences: occurrences,
      programEnrollments: enrollments,
      programDayLogs: dayLogs,
      focusSessions: focus,
      sleepEntries: sleep,
      journalEntries: journal,
      garden: garden ? { ...garden, plants } : null,
      rewardLedger: rewards,
      achievements,
      notificationPreferences,
    }
    return c.json(payload)
  })

  routes.delete('/', validate('json', z.object({ confirm: z.literal('удалить аккаунт') })), async (c) => {
    const userId = c.var.user.id
    // Сессии и все продуктовые строки уходят каскадом по внешним ключам.
    await input.db.user.delete({ where: { id: userId } })
    return c.body(null, 204)
  })

  return { routes }
}
