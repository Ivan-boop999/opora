import { consentsResponseSchema, preferencesResponseSchema } from '@opora/contracts'
import { OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'

import type { DbClient } from '../../db'
import { validate } from '../../http/product-routes'
import type { AuthHttpEnv } from '../auth'
import { PreferencesService } from './application/preferences-service'
import { consentGrantInput, preferencesUpdateInput } from './application/preferences-service'
import { createPrismaPreferencesRepository } from './infrastructure/preferences-repository'

export function createPreferencesModule(input: {
  db: DbClient
  requireAuth: MiddlewareHandler<AuthHttpEnv>
}) {
  const service = new PreferencesService(createPrismaPreferencesRepository(input.db))

  const routes = new OpenAPIHono<AuthHttpEnv>()
  routes.use('*', input.requireAuth)

  routes.get('/', async (c) => {
    const record = await service.get(c.var.user.id)
    return c.json(preferencesResponseSchema.parse(record), 200)
  })

  routes.put('/', validate('json', preferencesUpdateInput), async (c) => {
    const record = await service.update(c.var.user.id, c.req.valid('json'))
    return c.json(preferencesResponseSchema.parse(record), 200)
  })

  routes.post('/onboarding/finish', validate('json', preferencesUpdateInput), async (c) => {
    const record = await service.finishOnboarding(c.var.user.id, c.req.valid('json'))
    return c.json(preferencesResponseSchema.parse(record), 200)
  })

  routes.get('/consents', async (c) => {
    return c.json(consentsResponseSchema.parse({ consents: await service.consents(c.var.user.id) }), 200)
  })

  routes.post('/consents', validate('json', consentGrantInput), async (c) => {
    const consents = await service.grant(c.var.user.id, c.req.valid('json'))
    return c.json(consentsResponseSchema.parse({ consents }), 200)
  })

  return { service, routes }
}

export type { PreferencesService } from './application/preferences-service'
