import type { MiddlewareHandler } from 'hono'

import type { DbClient } from '../../db'
import type { AuthHttpEnv } from '../auth'
import { GardenService } from './application/garden-service'
import { createPrismaGardenRepository } from './infrastructure/garden-repository'
import { createGardenRoutes } from './transport/routes'

export function createGardenModule(input: {
  dateKeyNow: (userId: string) => Promise<string>
  db: DbClient
  requireAuth: MiddlewareHandler<AuthHttpEnv>
}) {
  const service = new GardenService(createPrismaGardenRepository(input.db))

  return {
    service,
    routes: createGardenRoutes({
      dateKeyNow: input.dateKeyNow,
      requireAuth: input.requireAuth,
      service,
    }),
  }
}

export { GardenFailure, targetStage, SPECIES_UNLOCK_AT, STAGE_THRESHOLDS, DAILY_DROP_CAP, RULES_VERSION, SPECIES_LABEL, ACHIEVEMENT_LABELS } from './application/garden-service'
export type { GardenService, GardenState, RewardKind } from './application/garden-service'
