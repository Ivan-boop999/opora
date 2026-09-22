import type { MiddlewareHandler } from 'hono'

import type { DbClient } from '../../db'
import type { AuthHttpEnv } from '../auth'
import { PracticesService } from './application/practices-service'
import { createPrismaPracticesRepository } from './infrastructure/practices-repository'
import { createPracticesRoutes } from './transport/routes'

export function createPracticesModule(input: {
  dateKeyNow: (userId: string) => Promise<string>
  db: DbClient
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  rewards: {
    onSessionFinished: (input: {
      userId: string
      sessionId: string
      dateKey: string
      distinctActionToday: boolean
    }) => Promise<unknown>
    onTriedEasier: (userId: string) => Promise<unknown>
  }
  activeProgramPractice: (userId: string) => Promise<string | null>
}) {
  const service = new PracticesService(createPrismaPracticesRepository(input.db), {
    dateKeyNow: input.dateKeyNow,
    rewards: input.rewards as never,
  })

  return {
    service,
    routes: createPracticesRoutes({
      requireAuth: input.requireAuth,
      service,
      activeProgramPractice: input.activeProgramPractice,
    }),
  }
}

export type { PracticesService } from './application/practices-service'
export { recommend, RECOMMENDATION_RULES_VERSION } from './application/recommendation-engine'
