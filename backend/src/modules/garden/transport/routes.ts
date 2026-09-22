import { gardenResponseSchema, gardenSceneRequestSchema, gardenPlantRequestSchema, gardenPlantUpdateSchema } from '@opora/contracts'
import { OpenAPIHono } from '@hono/zod-openapi'

import { AppError } from '../../../http/errors'
import { validate } from '../../../http/product-routes'
import type { AuthHttpEnv } from '../../auth'
import { GardenFailure, type GardenService } from '../application/garden-service'

export function createGardenRoutes(input: {
  dateKeyNow: (userId: string) => Promise<string>
  requireAuth: import('hono').MiddlewareHandler<AuthHttpEnv>
  service: GardenService
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>()
  routes.use('*', input.requireAuth)

  routes.get('/', async (c) => {
    const state = await input.service.getState(c.var.user.id, await input.dateKeyNow(c.var.user.id))
    return c.json(gardenResponseSchema.parse(state), 200)
  })

  routes.post('/plants', validate('json', gardenPlantRequestSchema), async (c) => {
    const { species } = c.req.valid('json')
    try {
      const plant = await input.service.plant({ userId: c.var.user.id, species })
      return c.json(plant, 201)
    } catch (error) {
      throw toHttpError(error)
    }
  })

  routes.patch('/plants/:id', validate('json', gardenPlantUpdateSchema), async (c) => {
    const { id } = c.req.param()
    try {
      await input.service.updatePlant(c.var.user.id, id, c.req.valid('json'))
      return c.body(null, 204)
    } catch (error) {
      throw toHttpError(error)
    }
  })

  routes.put('/scene', validate('json', gardenSceneRequestSchema), async (c) => {
    await input.service.setScene(c.var.user.id, c.req.valid('json').scene)
    return c.body(null, 204)
  })

  return routes
}

function toHttpError(error: unknown): unknown {
  if (error instanceof GardenFailure) {
    const status = error.kind === 'plant_not_found' ? 404 : 409
    return new AppError(status, status === 404 ? 'NOT_FOUND' : 'CONFLICT', error.message)
  }
  return error
}
