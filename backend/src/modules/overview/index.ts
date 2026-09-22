import { OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'
import { z } from 'zod'

import type { AuthHttpEnv } from '../auth'
import { validate } from '../../http/product-routes'
import { insightsQuerySchema } from '@opora/contracts'
import { OverviewService } from './application/overview-service'

export function createOverviewModule(input: {
  ports: ConstructorParameters<typeof OverviewService>[0]
  requireAuth: MiddlewareHandler<AuthHttpEnv>
}) {
  const service = new OverviewService(input.ports)

  const routes = new OpenAPIHono<AuthHttpEnv>()
  routes.use('*', input.requireAuth)

  routes.get('/today', async (c) => {
    return c.json(await service.today(c.var.user.id), 200)
  })

  routes.get('/insights', validate('query', insightsQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const period = z.enum(['7', '30', '90', 'all']).parse(query.period)
    return c.json(await service.insights(c.var.user.id, period), 200)
  })

  return { service, routes }
}

export type { OverviewService } from './application/overview-service'

export { createInsightsAdapter } from './infrastructure/insights-adapter'
