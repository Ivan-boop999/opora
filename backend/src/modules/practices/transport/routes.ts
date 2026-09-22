import {
  practiceListQuerySchema,
  recommendationQuerySchema,
  sessionCompleteSchema,
  sessionFeedbackSchema,
  sessionStartSchema,
} from '@opora/contracts'
import { OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'
import { z } from 'zod'

import type { AuthHttpEnv } from '../../auth'
import { AppError } from '../../../http/errors'
import { queryRange, validate } from '../../../http/product-routes'
import type { PracticesService } from '../application/practices-service'

const codeParam = z.object({ code: z.string().min(2).max(16) })
const idParam = z.object({ id: z.string().uuid() })

export function createPracticesRoutes(input: {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  service: PracticesService
  activeProgramPractice: (userId: string) => Promise<string | null>
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>()
  routes.use('*', input.requireAuth)

  routes.get('/', validate('query', practiceListQuerySchema), async (c) => {
    const result = await input.service.list(c.var.user.id, c.req.valid('query'))
    return c.json(result, 200)
  })

  routes.get('/recommendation', validate('query', recommendationQuerySchema), async (c) => {
    const query = c.req.valid('query')
    const activeProgramPracticeCode = await input.activeProgramPractice(c.var.user.id)
    const recommendation = await input.service.recommend(c.var.user.id, {
      need: query.need,
      minutes: query.minutes,
      activeProgramPracticeCode,
    })
    if (!recommendation) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message:
              'Под твои условия пока не подходит ни одна карточка — попробуй изменить фильтры',
          },
        },
        404,
      )
    }
    return c.json(recommendation, 200)
  })

  routes.get('/:code', async (c) => {
    const { code } = await codeParam.parseAsync({ code: c.req.param('code') })
    const demo = c.req.query('demo') === 'true'
    const practice = await input.service.byCode(c.var.user.id, code, { demo })
    if (!practice) throw new AppError(404, 'NOT_FOUND', 'Карточка не найдена')
    return c.json(practice, 200)
  })

  routes.post('/:code/favorite', async (c) => {
    const { code } = await codeParam.parseAsync({ code: c.req.param('code') })
    if (!(await input.service.setFavorite(c.var.user.id, code, true))) {
      throw new AppError(404, 'NOT_FOUND', 'Карточка не найдена')
    }
    return c.body(null, 204)
  })

  routes.delete('/:code/favorite', async (c) => {
    const { code } = await codeParam.parseAsync({ code: c.req.param('code') })
    await input.service.setFavorite(c.var.user.id, code, false)
    return c.body(null, 204)
  })

  routes.post('/:code/exclusion', async (c) => {
    const { code } = await codeParam.parseAsync({ code: c.req.param('code') })
    if (!(await input.service.setExclusion(c.var.user.id, code, true))) {
      throw new AppError(404, 'NOT_FOUND', 'Карточка не найдена')
    }
    return c.body(null, 204)
  })

  routes.delete('/:code/exclusion', async (c) => {
    const { code } = await codeParam.parseAsync({ code: c.req.param('code') })
    await input.service.setExclusion(c.var.user.id, code, false)
    return c.body(null, 204)
  })

  routes.post('/sessions', validate('json', sessionStartSchema), async (c) => {
    const session = await input.service.startSession(c.var.user.id, c.req.valid('json'))
    if (!session) throw new AppError(404, 'NOT_FOUND', 'Карточка не найдена')
    return c.json({ session }, 201)
  })

  routes.get('/sessions', async (c) => {
    const items = await input.service.listSessions(c.var.user.id, queryRange(c))
    return c.json({ items })
  })

  routes.post('/sessions/:id/complete', validate('json', sessionCompleteSchema), async (c) => {
    const { id } = await idParam.parseAsync({ id: c.req.param('id') })
    const result = await input.service.completeSession(c.var.user.id, id, c.req.valid('json'))
    if ('error' in result && result.error === 'not_found') {
      throw new AppError(404, 'NOT_FOUND', 'Сессия не найдена')
    }
    return c.json(result, 200)
  })

  routes.post('/sessions/:id/abandon', async (c) => {
    const { id } = await idParam.parseAsync({ id: c.req.param('id') })
    await input.service.abandonSession(c.var.user.id, id)
    return c.body(null, 204)
  })

  routes.post('/sessions/:id/feedback', validate('json', sessionFeedbackSchema), async (c) => {
    const { id } = await idParam.parseAsync({ id: c.req.param('id') })
    if (!(await input.service.leaveFeedback(c.var.user.id, id, c.req.valid('json')))) {
      throw new AppError(404, 'NOT_FOUND', 'Сессия не найдена')
    }
    return c.body(null, 204)
  })

  return routes
}
