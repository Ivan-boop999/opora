import { OpenAPIHono } from '@hono/zod-openapi'
import type { MiddlewareHandler } from 'hono'
import { z } from 'zod'

import type { DbClient } from '../../db'
import { AppError } from '../../http/errors'
import { validate } from '../../http/product-routes'
import type { AuthHttpEnv } from '../auth'

/**
 * Контентная админка: карточки, программы, ресурсы помощи. Доступ — только
 * роль admin (requireAdmin из auth-модуля); каждое изменение пишется в
 * AdminAuditLog. Черновики видны только здесь; публикация — явное действие.
 */

const practiceInput = z.object({
  code: z.string().min(2).max(16).optional(),
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(400),
  category: z.string().min(2).max(24),
  tags: z.array(z.string().max(32)).max(10).default([]),
  estimatedMinutes: z.number().int().min(1).max(60),
  effort: z.enum(['low', 'medium']),
  contexts: z.array(z.string().max(24)).max(10).default([]),
  exclusions: z.array(z.string().max(24)).max(8).default([]),
  steps: z.array(z.object({ text: z.string().min(1).max(500), seconds: z.number().int().optional() })).min(1).max(5),
  easierVariant: z.string().min(1).max(400),
  stopGuidance: z.string().max(400).nullable().optional(),
  reviewStatus: z.enum(['draft', 'published', 'retired']).default('draft'),
})

const programDayInput = z.object({
  dayNumber: z.number().int().min(1).max(30),
  intro: z.string().min(1).max(500),
  practiceCode: z.string().max(16).nullable().optional(),
  alternativePracticeCode: z.string().max(16).nullable().optional(),
  question: z.string().max(300).nullable().optional(),
})

const resourceInput = z.object({
  country: z.string().min(2).max(2),
  title: z.string().min(1).max(160),
  orgUrl: z.string().url().max(400),
  contacts: z.array(z.object({ label: z.string().max(60), value: z.string().max(120) })).min(1).max(6),
  hours: z.string().max(120).nullable().optional(),
  status: z.enum(['draft', 'published', 'retired']).default('draft'),
})

export function createAdminContentModule(input: {
  db: DbClient
  requireAdmin: MiddlewareHandler<AuthHttpEnv>
}) {
  const routes = new OpenAPIHono<AuthHttpEnv>()
  routes.use('*', input.requireAdmin)
  const db = input.db

  const audit = (c: { var: { user: { id: string } } }, action: string, entity: string, entityId?: string, payload?: unknown) =>
    db.adminAuditLog
      .create({
        data: {
          actorId: c.var.user.id,
          action,
          entity,
          entityId: entityId ?? null,
          payload: (payload ?? {}) as object,
        },
      })
      .catch(() => null)

  // --- Практики ---------------------------------------------------------------

  routes.get('/practices', async (c) => {
    const versions = await db.practiceVersion.findMany({
      include: { practice: { select: { code: true } } },
      orderBy: [{ practiceId: 'asc' }, { version: 'desc' }],
    })
    const newest = new Map<string, typeof versions[number]>()
    for (const version of versions) {
      if (!newest.has(version.practiceId)) newest.set(version.practiceId, version)
    }
    return c.json({ items: [...newest.values()] })
  })

  routes.post('/practices', validate('json', practiceInput), async (c) => {
    const body = c.req.valid('json')
    const code = body.code ?? `C${Date.now().toString(36).slice(-5).toUpperCase()}`
    const practice = await db.practice.upsert({
      where: { code },
      create: { code },
      update: {},
    })
    const latest = await db.practiceVersion.findFirst({
      where: { practiceId: practice.id },
      orderBy: { version: 'desc' },
    })
    const created = await db.practiceVersion.create({
      data: {
        practiceId: practice.id,
        version: (latest?.version ?? 0) + 1,
        title: body.title,
        summary: body.summary,
        category: body.category,
        tags: body.tags,
        estimatedMinutes: body.estimatedMinutes,
        effort: body.effort,
        contexts: body.contexts,
        exclusions: body.exclusions,
        steps: body.steps,
        easierVariant: body.easierVariant,
        stopGuidance: body.stopGuidance ?? null,
        sourceNotes: 'Создано в админке',
        reviewStatus: body.reviewStatus,
        publishedAt: body.reviewStatus === 'published' ? new Date() : null,
      },
    })
    await audit(c, 'create', 'practice', code, { title: body.title })
    return c.json({ code, version: created.version }, 201)
  })

  routes.patch('/practices/:code/status', validate('json', z.object({ status: z.enum(['draft', 'published', 'retired']) })), async (c) => {
    const code = c.req.param('code')
    const { status } = c.req.valid('json')
    const practice = await db.practice.findUnique({ where: { code } })
    if (!practice) throw new AppError(404, 'NOT_FOUND', 'Карточка не найдена')
    const latest = await db.practiceVersion.findFirst({
      where: { practiceId: practice.id },
      orderBy: { version: 'desc' },
    })
    if (!latest) throw new AppError(404, 'NOT_FOUND', 'У карточки нет версий')
    await db.practiceVersion.update({
      where: { id: latest.id },
      data: { reviewStatus: status, publishedAt: status === 'published' ? new Date() : latest.publishedAt },
    })
    await audit(c, 'status', 'practice', code, { status })
    return c.body(null, 204)
  })

  // --- Программы ---------------------------------------------------------------

  routes.get('/programs', async (c) => {
    const versions = await db.programVersion.findMany({
      include: { program: { select: { code: true } }, days: { orderBy: { dayNumber: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    })
    return c.json({ items: versions })
  })

  routes.patch('/programs/:code/days/:day', validate('json', programDayInput.partial()), async (c) => {
    const code = c.req.param('code')
    const dayNumber = Number(c.req.param('day'))
    const body = c.req.valid('json')
    const program = await db.practice.findUnique({ where: { code } })
    const programRow = program ? null : await db.program.findUnique({ where: { code } })
    if (!programRow) throw new AppError(404, 'NOT_FOUND', 'Программа не найдена')
    const version = await db.programVersion.findFirst({
      where: { programId: programRow.id, status: 'published' },
      orderBy: { version: 'desc' },
    })
    if (!version) throw new AppError(404, 'NOT_FOUND', 'У программы нет опубликованной версии')
    await db.programDay.updateMany({
      where: { programVersionId: version.id, dayNumber },
      data: {
        ...(body.intro !== undefined ? { intro: body.intro } : {}),
        ...(body.practiceCode !== undefined ? { practiceCode: body.practiceCode } : {}),
        ...(body.alternativePracticeCode !== undefined
          ? { alternativePracticeCode: body.alternativePracticeCode }
          : {}),
        ...(body.question !== undefined ? { question: body.question } : {}),
      },
    })
    await audit(c, 'update-day', 'program', code, { dayNumber, ...body })
    return c.body(null, 204)
  })

  routes.patch('/programs/:code/status', validate('json', z.object({ status: z.enum(['draft', 'published', 'retired']) })), async (c) => {
    const code = c.req.param('code')
    const { status } = c.req.valid('json')
    const program = await db.program.findUnique({ where: { code } })
    if (!program) throw new AppError(404, 'NOT_FOUND', 'Программа не найдена')
    await db.programVersion.updateMany({
      where: { programId: program.id, status: { not: 'retired' } },
      data: { status },
    })
    await audit(c, 'status', 'program', code, { status })
    return c.body(null, 204)
  })

  // --- Ресурсы помощи ------------------------------------------------------------

  routes.get('/resources', async (c) => {
    const rows = await db.supportResource.findMany({ orderBy: [{ country: 'asc' }, { title: 'asc' }] })
    return c.json({ items: rows })
  })

  routes.post('/resources', validate('json', resourceInput), async (c) => {
    const body = c.req.valid('json')
    const created = await db.supportResource.create({
      data: {
        country: body.country.toUpperCase(),
        title: body.title,
        orgUrl: body.orgUrl,
        contacts: body.contacts,
        hours: body.hours ?? null,
        status: body.status,
      },
    })
    await audit(c, 'create', 'support-resource', created.id, { title: body.title, country: body.country })
    return c.json(created, 201)
  })

  routes.patch('/resources/:id', validate('json', resourceInput.partial().extend({ verified: z.boolean().optional() })), async (c) => {
    const id = c.req.param('id')
    const body = c.req.valid('json')
    const existing = await db.supportResource.findUnique({ where: { id } })
    if (!existing) throw new AppError(404, 'NOT_FOUND', 'Ресурс не найден')
    await db.supportResource.update({
      where: { id },
      data: {
        ...(body.country !== undefined ? { country: body.country.toUpperCase() } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.orgUrl !== undefined ? { orgUrl: body.orgUrl } : {}),
        ...(body.contacts !== undefined ? { contacts: body.contacts } : {}),
        ...(body.hours !== undefined ? { hours: body.hours } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.verified ? { verifiedAt: new Date() } : {}),
      },
    })
    await audit(c, 'update', 'support-resource', id, body)
    return c.body(null, 204)
  })

  routes.get('/audit', async (c) => {
    const rows = await db.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { email: true } } },
    })
    return c.json({ items: rows })
  })

  routes.get('/stats', async (c) => {
    const [users, sessions, checkIns, journal, activePrograms] = await Promise.all([
      db.user.count(),
      db.practiceSession.count(),
      db.checkIn.count(),
      db.journalEntry.count(),
      db.programEnrollment.count({ where: { status: 'active' } }),
    ])
    return c.json({ users, sessions, checkIns, journal, activePrograms })
  })

  return { routes }
}
