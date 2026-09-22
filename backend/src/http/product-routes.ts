import type { Context, MiddlewareHandler } from 'hono'
import { validator } from 'hono/validator'
import type { z, ZodType } from 'zod'

import { AppError } from './errors'

type ValidationTarget = 'json' | 'query'

/**
 * Lean zod validation for product routes: the same error envelope the OpenAPI
 * surfaces of the template produce, without carrying full OpenAPI route
 * declarations for every internal endpoint. Uses hono's own validator so
 * handlers keep reading c.req.valid('json').
 */
export function validate<S extends ZodType>(target: ValidationTarget, schema: S) {
  return validator(target, (value: unknown): z.infer<S> => {
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request data', {
        issues: parsed.error.issues,
      })
    }
    return parsed.data as z.infer<S>
  })
}

/** Parses a page-sized date range from query strings. */
export function queryRange(c: Context): { from?: string; to?: string } {
  const from = c.req.query('from')
  const to = c.req.query('to')
  return {
    from: from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : undefined,
    to: to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : undefined,
  }
}
