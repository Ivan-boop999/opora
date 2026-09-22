import {
  enrollmentDayRequestSchema,
  focusFinishSchema,
  focusMarkSchema,
  focusStartSchema,
  routineInputSchema,
  routineOccurrenceUpdateSchema,
  sleepInputSchema,
} from '@opora/contracts'
import { OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'
import { z } from 'zod'

import type { AuthHttpEnv } from '../../auth'
import { AppError } from '../../../http/errors'
import { queryRange, validate } from '../../../http/product-routes'
import {
  FocusService,
  PlansFailure,
  ProgramsService,
  RoutinesService,
  SleepService,
} from '../application/plans-service'

const idParam = z.object({ id: z.string().uuid() })
const dateParam = z.object({ dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })

function toHttpError(error: unknown): unknown {
  if (error instanceof PlansFailure) {
    const notFound = error.kind.endsWith('_not_found')
    return new AppError(
      notFound ? 404 : 409,
      notFound ? 'NOT_FOUND' : 'CONFLICT',
      error.message,
    )
  }
  return error
}

export function createPlansRoutes(input: {
  requireAuth: MiddlewareHandler<AuthHttpEnv>
  routines: RoutinesService
  programs: ProgramsService
  focus: FocusService
  sleep: SleepService
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>()
  routes.use('*', input.requireAuth)

  // ---- routines (личные опоры дня)
  routes.get('/routines', async (c) => {
    return c.json({ items: await input.routines.list(c.var.user.id) })
  })

  routes.post('/routines', validate('json', routineInputSchema), async (c) => {
    try {
      return c.json(await input.routines.create(c.var.user.id, c.req.valid('json')), 201)
    } catch (error) {
      throw toHttpError(error)
    }
  })

  routes.patch('/routines/:id', validate('json', routineInputSchema.partial()), async (c) => {
    const { id } = await idParam.parseAsync({ id: c.req.param('id') })
    try {
      return c.json(await input.routines.update(c.var.user.id, id, c.req.valid('json')))
    } catch (error) {
      throw toHttpError(error)
    }
  })

  routes.delete('/routines/:id', async (c) => {
    const { id } = await idParam.parseAsync({ id: c.req.param('id') })
    try {
      await input.routines.delete(c.var.user.id, id)
      return c.body(null, 204)
    } catch (error) {
      throw toHttpError(error)
    }
  })

  routes.post('/routines/:id/pause', async (c) => {
    const { id } = await idParam.parseAsync({ id: c.req.param('id') })
    return c.json(await input.routines.setPaused(c.var.user.id, id, true))
  })

  routes.post('/routines/:id/resume', async (c) => {
    const { id } = await idParam.parseAsync({ id: c.req.param('id') })
    return c.json(await input.routines.setPaused(c.var.user.id, id, false))
  })

  routes.post('/routines/:id/archive', async (c) => {
    const { id } = await idParam.parseAsync({ id: c.req.param('id') })
    return c.json(await input.routines.archive(c.var.user.id, id))
  })

  routes.post(
    '/routines/:id/occurrences/:dateKey',
    validate('json', routineOccurrenceUpdateSchema),
    async (c) => {
      const { id, dateKey } = {
        id: c.req.param('id'),
        dateKey: c.req.param('dateKey'),
      }
      await dateParam.parseAsync({ dateKey })
      try {
        await input.routines.setOccurrence(c.var.user.id, id, dateKey, c.req.valid('json').status)
        return c.body(null, 204)
      } catch (error) {
        throw toHttpError(error)
      }
    },
  )

  // ---- programs
  routes.get('/programs', async (c) => {
    const programs = await input.programs.list()
    return c.json({ items: programs.map(({ days: _days, ...program }) => program) })
  })

  routes.get('/programs/:code', async (c) => {
    const program = await input.programs.byCode(c.req.param('code'))
    if (!program) throw new AppError(404, 'NOT_FOUND', 'Программа не найдена')
    return c.json(program)
  })

  routes.get('/program-enrollment', async (c) => {
    return c.json({ enrollment: await input.programs.activeEnrollment(c.var.user.id) })
  })

  routes.post('/programs/:code/enroll', async (c) => {
    try {
      return c.json(await input.programs.enroll(c.var.user.id, c.req.param('code')), 201)
    } catch (error) {
      throw toHttpError(error)
    }
  })

  routes.post('/program-enrollment/pause', async (c) => {
    await input.programs.pause(c.var.user.id)
    return c.body(null, 204)
  })

  routes.post('/program-enrollment/resume', async (c) => {
    await input.programs.resume(c.var.user.id)
    return c.body(null, 204)
  })

  routes.post('/program-enrollment/drop', async (c) => {
    await input.programs.drop(c.var.user.id)
    return c.body(null, 204)
  })

  routes.post(
    '/program-enrollment/day',
    validate('json', enrollmentDayRequestSchema),
    async (c) => {
      try {
        return c.json(await input.programs.logDay(c.var.user.id, c.req.valid('json').status))
      } catch (error) {
        throw toHttpError(error)
      }
    },
  )

  // ---- focus
  routes.post('/focus', validate('json', focusStartSchema), async (c) => {
    return c.json({ focus: await input.focus.start(c.var.user.id, c.req.valid('json')) }, 201)
  })

  routes.post('/focus/:id/marks', validate('json', focusMarkSchema), async (c) => {
    const { id } = await idParam.parseAsync({ id: c.req.param('id') })
    try {
      await input.focus.mark(c.var.user.id, id, c.req.valid('json'))
      return c.body(null, 204)
    } catch (error) {
      throw toHttpError(error)
    }
  })

  routes.post('/focus/:id/finish', validate('json', focusFinishSchema), async (c) => {
    const { id } = await idParam.parseAsync({ id: c.req.param('id') })
    try {
      return c.json({ focus: await input.focus.finish(c.var.user.id, id, c.req.valid('json').status) })
    } catch (error) {
      throw toHttpError(error)
    }
  })

  routes.get('/focus', async (c) => {
    return c.json({ items: await input.focus.list(c.var.user.id, queryRange(c)) })
  })

  // ---- sleep
  routes.put('/sleep/:dateKey', validate('json', sleepInputSchema), async (c) => {
    const { dateKey } = await dateParam.parseAsync({ dateKey: c.req.param('dateKey') })
    return c.json(await input.sleep.upsertForDate(c.var.user.id, dateKey, c.req.valid('json')))
  })

  routes.get('/sleep', async (c) => {
    return c.json({ items: await input.sleep.list(c.var.user.id, queryRange(c)) })
  })

  return routes
}
