import { supportListSchema } from '@opora/contracts'
import { OpenAPIHono } from '@hono/zod-openapi'

import type { DbClient } from '../../db'

/**
 * Support resources are content, curated per country. Only published rows are
 * visible; drafts exist for the owner to verify contacts before exposure. The
 * product never invents hotlines: an unsupported country gets an honest empty
 * answer the interface can explain.
 */
export function createSupportModule(input: { db: DbClient }) {
  const routes = new OpenAPIHono()

  routes.get('/resources', async (c) => {
    const country = c.req.query('country')
    const rows = await input.db.supportResource.findMany({
      where: { status: 'published', ...(country ? { country } : {}) },
      orderBy: { title: 'asc' },
    })
    const items = rows.map((row) => ({
      id: row.id,
      country: row.country,
      title: row.title,
      orgUrl: row.orgUrl,
      contacts: (row.contacts as { label: string; value: string }[]) ?? [],
      hours: row.hours,
      status: row.status,
      verifiedAt: row.verifiedAt?.toISOString() ?? null,
    }))
    return c.json(supportListSchema.parse({ items }))
  })

  return { routes }
}
