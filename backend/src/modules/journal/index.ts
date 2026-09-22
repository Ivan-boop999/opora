import { journalInputSchema } from '@opora/contracts'
import { OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'
import { z } from 'zod'

import type { DbClient } from '../../db'
import { AppError } from '../../http/errors'
import { validate } from '../../http/product-routes'
import type { AuthHttpEnv } from '../auth'
import { JournalFailure, JournalService } from './application/journal-service'
import { createPrismaJournalRepository } from './infrastructure/journal-repository'

const idParam = z.object({ id: z.string().uuid() })
const updateSchema = journalInputSchema.partial().extend({
  expectedEditVersion: z.number().int().positive(),
})

export function createJournalModule(input: {
  dateKeyNow: (userId: string) => Promise<string>
  db: DbClient
  onCreated: (input: { userId: string; dateKey: string }) => Promise<unknown>
  requireAuth: MiddlewareHandler<AuthHttpEnv>
}) {
  const service = new JournalService(createPrismaJournalRepository(input.db), {
    dateKeyNow: input.dateKeyNow,
    onCreated: input.onCreated,
  })

  const routes = new OpenAPIHono<AuthHttpEnv>()
  routes.use('*', input.requireAuth)

  routes.post('/', validate('json', journalInputSchema), async (c) => {
    return c.json(await service.create(c.var.user.id, c.req.valid('json')), 201)
  })

  routes.get('/', async (c) => {
    const items = await service.list(c.var.user.id, {
      search: c.req.query('search') || undefined,
      tag: c.req.query('tag') || undefined,
      favorite: c.req.query('favorite') === 'true' || undefined,
      from: c.req.query('from'),
      to: c.req.query('to'),
    })
    return c.json({ items })
  })

  routes.get('/:id', async (c) => {
    const { id } = await idParam.parseAsync({ id: c.req.param('id') })
    const entry = await service.find(c.var.user.id, id)
    if (!entry) throw new AppError(404, 'NOT_FOUND', 'Запись не найдена')
    return c.json(entry)
  })

  routes.patch('/:id', validate('json', updateSchema), async (c) => {
    const { id } = await idParam.parseAsync({ id: c.req.param('id') })
    const { expectedEditVersion, ...patch } = c.req.valid('json')
    try {
      return c.json(await service.update(c.var.user.id, id, patch, expectedEditVersion))
    } catch (error) {
      if (error instanceof JournalFailure) {
        throw new AppError(
          error.kind === 'not_found' ? 404 : 409,
          error.kind === 'not_found' ? 'NOT_FOUND' : 'CONFLICT',
          error.message,
        )
      }
      throw error
    }
  })

  routes.delete('/:id', async (c) => {
    const { id } = await idParam.parseAsync({ id: c.req.param('id') })
    try {
      await service.delete(c.var.user.id, id)
      return c.body(null, 204)
    } catch (error) {
      if (error instanceof JournalFailure) {
        throw new AppError(404, 'NOT_FOUND', error.message)
      }
      throw error
    }
  })

  routes.delete('/all', async (c) => {
    const deleted = await service.deleteAll(c.var.user.id)
    return c.json({ deleted })
  })

  return { service, routes }
}

export type { JournalService } from './application/journal-service'
