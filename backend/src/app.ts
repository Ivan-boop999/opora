// Must run before imports that construct schemas. Keep the auto-compile side effect backend-only:
// browser runtimes should not invoke eval-like code generation.
import 'zod/compile'

import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'

import { createBackgroundTasks, type TaskDeferrer } from './background-tasks'
import type { DbClient } from './db'
import { disabledEmailDelivery, type EmailDelivery } from './email'
import type { AppEnv } from './env'
import { errorResponse, handleError, validationErrorHook } from './http/errors'
import { createReadinessProbe } from './http/readiness'
import { createAuthSecurity, createFixedWindowRateLimit } from './http/security'
import { localDateKey, localMinutesOfDay } from './local-date'
import { createAuthModule, type AuthHttpEnv } from './modules/auth'
import { createCheckInsModule, toCheckInDto } from './modules/checkins'
import { createGardenModule } from './modules/garden'
import { createJournalModule } from './modules/journal'
import { createInsightsAdapter, createOverviewModule } from './modules/overview'
import { createPlansModule } from './modules/plans'
import { createPreferencesModule } from './modules/preferences'
import { createPracticesModule } from './modules/practices'
import { createSupportModule } from './modules/support'
import { createUploadsModule } from './modules/uploads'
import { createUsersModule } from './modules/users'
import { createRateLimitStores } from './rate-limit'
import {
  apiCorsAllowedHeaders,
  browserUploadExposedHeaders,
  createPrivateStorage,
  type PrivateStorageRuntime,
} from './storage'


type CreateAppOptions = {
  backgroundTasks?: TaskDeferrer
  emailDelivery?: EmailDelivery
  env: AppEnv
  prisma: DbClient
  /**
   * Storage is never absent: the filesystem driver always works. Injectable so tests can point
   * it at a temporary directory instead of the configured root.
   */
  privateStorage?: PrivateStorageRuntime
}

export function createApp({
  backgroundTasks = createBackgroundTasks(),
  emailDelivery = disabledEmailDelivery,
  env,
  prisma,
  privateStorage,
}: CreateAppOptions) {
  const storage = privateStorage ?? createPrivateStorage(env)
  const auth = createAuthModule({ db: prisma, emailDelivery, env })
  // One store per policy, in memory or in PostgreSQL as RATE_LIMIT_STORE says; the middleware
  // never learns which.
  const rateLimitStore = createRateLimitStores(env, prisma)
  const adminUsersReadRateLimit = createFixedWindowRateLimit<AuthHttpEnv>({
    errorMessage: 'Too many admin user directory requests',
    key: (c) => c.var.user.id,
    max: env.ADMIN_USERS_READ_RATE_LIMIT_MAX,
    store: rateLimitStore('admin-users-read'),
    windowSeconds: env.ADMIN_USERS_READ_RATE_LIMIT_WINDOW_SECONDS,
  })
  const users = createUsersModule({
    adminUsersReadRateLimit,
    db: prisma,
    requireAdmin: auth.requireAdmin,
    requireAuth: auth.requireAuth,
  })
  const uploads = createUploadsModule({
    backgroundTasks,
    db: prisma,
    requireAuth: auth.requireAuth,
    storage: storage.storage,
  })
  const app = new OpenAPIHono<AuthHttpEnv>({
    defaultHook: validationErrorHook,
  })
  app.openAPIRegistry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  })

  app.use(secureHeaders())
  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin) return env.CORS_ORIGINS[0] ?? null
        return env.CORS_ORIGINS.includes(origin) ? origin : null
      },
      // One global CORS layer, because hono answers a preflight in the first middleware that
      // matches: a second, route-scoped cors() registered later would never see an OPTIONS.
      // The upload headers therefore have to live here. They come from the same constant the
      // local S3 bucket's CORS rule uses, so both drivers allow exactly the same upload request.
      allowHeaders: apiCorsAllowedHeaders,
      exposeHeaders: browserUploadExposedHeaders,
      allowMethods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
      maxAge: 600,
    }),
  )
  // Signing in and managing an account are two budgets of the same size, keyed by client address.
  const authSecurity = (policy: 'auth' | 'account') =>
    createAuthSecurity({
      bodyLimitBytes: env.AUTH_BODY_LIMIT_BYTES,
      rateLimitMax: env.AUTH_RATE_LIMIT_MAX,
      rateLimitWindowSeconds: env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
      store: rateLimitStore(policy),
      trustProxy: env.TRUST_PROXY,
      trustedProxyClientIpHeader: env.TRUSTED_PROXY_CLIENT_IP_HEADER,
      trustedProxyClientIpPosition: env.TRUSTED_PROXY_CLIENT_IP_POSITION,
    })
  for (const middleware of authSecurity('auth')) {
    app.use('/api/auth/*', middleware)
  }
  for (const middleware of authSecurity('account')) {
    app.use('/api/users/*', middleware)
    app.use('/api/admin/*', middleware)
    app.use('/api/uploads/*', middleware)
    app.use('/api/app/*', middleware)
  }
  app.get('/', (c) => {
    return c.json({
      name: 'opora backend',
      status: 'ok',
    })
  })

  app.get('/health', (c) => {
    return c.json({
      status: 'ok',
    })
  })

  app.get('/health/live', (c) => {
    return c.json({
      status: 'ok',
    })
  })

  // Readiness is the one database-backed route that no limiter covers, so it answers from one
  // probe per second rather than one query per request. One second is invisible to the platform
  // checks that poll every 10 s, and it caps what an unauthenticated GET flood can cost the pool.
  const databaseReady = createReadinessProbe({
    check: () => prisma.$queryRaw`SELECT 1`,
    windowMs: 1_000,
  })
  app.get('/health/ready', async (c) => {
    return (await databaseReady())
      ? c.json({ status: 'ok' }, 200)
      : c.json({ status: 'unavailable' }, 503)
  })

  app.route('/api/auth', auth.routes)
  app.route('/api/users', users.userRoutes)
  app.route('/api/admin', users.adminRoutes)
  app.route('/api/uploads', uploads.routes)

  // ========================================================================
  // Wellness product modules. Local days follow the user's timezone; the
  // helper closure re-reads preferences on every call so a timezone change
  // applies to the next write without a restart.
  // ========================================================================
  const userTimezone = async (userId: string) => {
    const preferences = await prisma.userPreferences.findUnique({
      where: { userId },
      select: { timezone: true },
    })
    return preferences?.timezone ?? 'Europe/Moscow'
  }
  const dateKeyFor = async (userId: string) => localDateKey(new Date(), await userTimezone(userId))

  const preferences = createPreferencesModule({ db: prisma, requireAuth: auth.requireAuth })
  const garden = createGardenModule({
    dateKeyNow: dateKeyFor,
    db: prisma,
    requireAuth: auth.requireAuth,
  })
  const plans = createPlansModule({
    dateKeyNow: dateKeyFor,
    db: prisma,
    requireAuth: auth.requireAuth,
  })
  const practices = createPracticesModule({
    dateKeyNow: dateKeyFor,
    db: prisma,
    requireAuth: auth.requireAuth,
    rewards: {
      onSessionFinished: async ({ userId, sessionId, dateKey, distinctActionToday }) =>
        garden.service.applyReward({
          userId,
          basis: `practice-session:${sessionId}`,
          kind: distinctActionToday ? 'extra-action' : 'first-action',
          drops: distinctActionToday ? 1 : 2,
          dateKey,
        }),
      onTriedEasier: async (userId) => garden.service.achieve(userId, 'tried-easier'),
    },
    activeProgramPractice: async (userId) =>
      (await plans.programs.activeEnrollment(userId))?.day?.practiceCode ?? null,
  })
  const checkins = createCheckInsModule({
    dateKeyNow: dateKeyFor,
    db: prisma,
    onCreated: async ({ userId, dateKey }) => {
      await garden.service.applyReward({
        userId,
        basis: `checkin-day:${userId}:${dateKey}`,
        kind: 'checkin',
        drops: 1,
        dateKey,
      })
      const gardenState = await garden.service.getState(userId, dateKey)
      if (gardenState.plants.length === 0 && gardenState.totalDrops >= 2) {
        // First useful interaction: welcome the sprout automatically.
        await garden.service.plant({ userId, species: 'sprout' })
        await garden.service.achieve(userId, 'first-step')
      }
    },
    requireAuth: auth.requireAuth,
  })
  const journal = createJournalModule({
    dateKeyNow: dateKeyFor,
    db: prisma,
    onCreated: async ({ userId, dateKey }) => {
      await garden.service.applyReward({
        userId,
        basis: `journal-day:${userId}:${dateKey}`,
        kind: 'journal',
        drops: 1,
        dateKey,
      })
    },
    requireAuth: auth.requireAuth,
  })

  const insightsData = createInsightsAdapter(prisma)
  const overview = createOverviewModule({
    requireAuth: auth.requireAuth,
    ports: {
      dateKeyNow: dateKeyFor,
      minutesNow: async (userId) => localMinutesOfDay(new Date(), await userTimezone(userId)),
      latestCheckIn: async (userId, dateKey) => {
        const row = await prisma.checkIn.findFirst({
          where: { userId, dateKey },
          orderBy: { createdAt: 'desc' },
        })
        if (!row) return null
        return toCheckInDto(row)
      },
      recommend: (userId, input) => practices.service.recommend(userId, input),
      routines: (userId) => plans.routines.list(userId),
      activeEnrollment: (userId) => plans.programs.activeEnrollment(userId),
      gardenSummary: async (userId, dateKey) => {
        const state = await garden.service.getState(userId, dateKey)
        const growing = state.plants[state.plants.length - 1] ?? null
        return {
          visible: state.visible,
          totalDrops: state.totalDrops,
          todayDrops: state.todayDrops,
          plantStage: growing?.stage ?? null,
          plantSpecies: growing?.species ?? null,
        }
      },
      favorites: async (userId, limit) => {
        const codes = await prisma.practiceFavorite.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: { practiceCode: true },
        })
        const items = await Promise.all(
          codes.map((row) => practices.service.byCode(userId, row.practiceCode)),
        )
        return items.filter((practice): practice is NonNullable<typeof practice> => practice !== null)
      },
      preferences: async (userId) => {
        const record = await preferences.service.get(userId)
        return {
          gamificationVisible: record.gamificationVisible,
          onboardingDone: record.onboardingDone,
          pacePreset: record.pacePreset,
          eveningTimeMinutes: record.eveningTimeMinutes,
        }
      },
      insightsData: (userId, from, to) => insightsData(userId, from, to),
    },
  })

  app.route('/api/app/preferences', preferences.routes)
  app.route('/api/app/garden', garden.routes)
  app.route('/api/app/practices', practices.routes)
  app.route('/api/app/checkins', checkins.routes)
  app.route('/api/app/journal', journal.routes)
  app.route('/api/app/plans', plans.routes)
  app.route('/api/app/overview', overview.routes)
  app.route('/api/app/support', createSupportModule({ db: prisma }).routes)

  // Only the filesystem driver needs the backend to serve the URLs it signs. With an S3 driver
  // the browser uploads straight to the bucket and there is nothing to mount here.
  if (storage.httpRoutes) {
    app.route('/storage', storage.httpRoutes)
  }

  app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
      title: 'opora API',
      version: '1.0.0',
    },
  })

  app.notFound((c) => c.json(errorResponse('NOT_FOUND', 'Route not found'), 404))
  app.onError(handleError)

  return app
}

export type AppType = ReturnType<typeof createApp>
