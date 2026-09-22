import type { MiddlewareHandler } from 'hono'

import type { DbClient } from '../../db'
import type { AuthHttpEnv } from '../auth'
import {
  FocusService,
  ProgramsService,
  RoutinesService,
  SleepService,
} from './application/plans-service'
import { createPrismaPlansRepository } from './infrastructure/plans-repository'
import { createPlansRoutes } from './transport/routes'

export function createPlansModule(input: {
  dateKeyNow: (userId: string) => Promise<string>
  db: DbClient
  requireAuth: MiddlewareHandler<AuthHttpEnv>
}) {
  const repository = createPrismaPlansRepository(input.db)
  const routines = new RoutinesService(repository, { dateKeyNow: input.dateKeyNow })
  const programs = new ProgramsService(repository, { dateKeyNow: input.dateKeyNow })
  const focus = new FocusService(repository, { dateKeyNow: input.dateKeyNow })
  const sleep = new SleepService(repository, { dateKeyNow: input.dateKeyNow })

  const routes = createPlansRoutes({
    requireAuth: input.requireAuth,
    routines,
    programs,
    focus,
    sleep,
  })

  return { routines, programs, focus, sleep, routes }
}

export type {
  FocusService,
  ProgramsService,
  RoutinesService,
  SleepService,
} from './application/plans-service'
export { PlansFailure } from './application/plans-service'
