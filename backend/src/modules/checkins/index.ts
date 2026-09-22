import { checkInInputSchema } from '@opora/contracts'
import { OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'
import { z } from 'zod'

import type { DbClient } from '../../db'
import { AppError } from '../../http/errors'
import { queryRange, validate } from '../../http/product-routes'
import type { AuthHttpEnv } from '../auth'
import { CheckInService } from './application/checkin-service'
import { createPrismaCheckInRepository } from './infrastructure/checkin-repository'

export function createCheckInsModule(input: {
  dateKeyNow: (userId: string) => Promise<string>
  db: DbClient
  onCreated: (input: { userId: string; dateKey: string }) => Promise<unknown>
  requireAuth: MiddlewareHandler<AuthHttpEnv>
}) {
  const service = new CheckInService(createPrismaCheckInRepository(input.db), {
    dateKeyNow: input.dateKeyNow,
    onCreated: input.onCreated,
  })

  const routes = new OpenAPIHono<AuthHttpEnv>()
  routes.use('*', input.requireAuth)

  routes.post('/', validate('json', checkInInputSchema), async (c) => {
    const created = await service.create(c.var.user.id, c.req.valid('json'))
    return c.json(service.validateDto(created), 201)
  })

  routes.get('/', async (c) => {
    const items = await service.list(c.var.user.id, queryRange(c))
    return c.json({ items })
  })

  const idSchema = z.object({ id: z.string().uuid() })

  routes.patch('/:id', validate('json', checkInInputSchema.partial()), async (c) => {
    const { id } = await idSchema.parseAsync({ id: c.req.param('id') })
    const updated = await service.update(c.var.user.id, id, c.req.valid('json'))
    if (!updated) throw new AppError(404, 'NOT_FOUND', 'Отметка не найдена')
    return c.json(service.validateDto(updated), 200)
  })

  routes.delete('/:id', async (c) => {
    const { id } = await idSchema.parseAsync({ id: c.req.param('id') })
    if (!(await service.delete(c.var.user.id, id))) {
      throw new AppError(404, 'NOT_FOUND', 'Отметка не найдена')
    }
    return c.body(null, 204)
  })

  return { service, routes }
}

export type { CheckInService } from './application/checkin-service'
