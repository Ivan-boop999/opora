import type {
  PracticeDto,
  SessionDto,
} from '@opora/contracts'
import type { z } from 'zod'

import type { DbClient } from '../../../db'
import type {
  CatalogFilters,
  PracticesRepository,
} from '../application/practices-service'
import { RECOMMENDATION_RULES_VERSION } from '../application/recommendation-engine'

type VersionRow = {
  practiceId: string
  practice: { code: string }
  version: number
  title: string
  summary: string
  category: string
  tags: string[]
  estimatedMinutes: number
  effort: string
  contexts: string[]
  requirements: string[]
  exclusions: string[]
  steps: unknown
  easierVariant: string
  alternativeCodes: string[]
  stopGuidance: string | null
  reviewStatus: string
  publishedAt: Date | null
}

export function createPrismaPracticesRepository(db: DbClient): PracticesRepository {
  return {
    async listPublished(filters) {
      const statuses = filters.demo ? ['published', 'draft'] : ['published']
      const rows = await db.practiceVersion.findMany({
        where: {
          reviewStatus: { in: statuses },
          ...(filters.category ? { category: filters.category } : {}),
          ...(filters.effort ? { effort: filters.effort } : {}),
          ...(filters.minutesMax ? { estimatedMinutes: { lte: filters.minutesMax } } : {}),
        },
        include: { practice: { select: { code: true } } },
        orderBy: [{ practiceId: 'asc' }, { version: 'desc' }],
      })

      // Newest version per practice only.
      const newest = new Map<string, (typeof rows)[number]>()
      for (const row of rows) {
        if (!newest.has(row.practiceId)) newest.set(row.practiceId, row)
      }
      let items = [...newest.values()].map(toPracticeDto)

      if (filters.context) {
        items = items.filter((practice) => practice.contexts.includes(filters.context!))
      }
      if (filters.search) {
        const needle = normalize(filters.search)
        items = items.filter((practice) =>
          [practice.title, practice.summary, ...practice.tags]
            .map(normalize)
            .some((field) => field.includes(needle)),
        )
      }
      return items.sort((left, right) => left.code.localeCompare(right.code))
    },

    async findByCode(code, options) {
      const practice = await db.practice.findUnique({ where: { code } })
      if (!practice) return null
      const row = await db.practiceVersion.findFirst({
        where: {
          practiceId: practice.id,
          ...(options?.demo ? {} : { reviewStatus: 'published' }),
        },
        include: { practice: { select: { code: true } } },
        orderBy: { version: 'desc' },
      })
      return row ? toPracticeDto(row) : null
    },

    async favorites(userId) {
      const rows = await db.practiceFavorite.findMany({
        where: { userId },
        select: { practiceCode: true },
      })
      return rows.map((row) => row.practiceCode)
    },

    async exclusions(userId) {
      const rows = await db.practiceExclusion.findMany({
        where: { userId },
        select: { practiceCode: true },
      })
      return rows.map((row) => row.practiceCode)
    },

    async setFavorite(userId, code, favorite) {
      if (favorite) {
        await db.practiceFavorite.upsert({
          where: { userId_practiceCode: { userId, practiceCode: code } },
          create: { userId, practiceCode: code },
          update: {},
        })
      } else {
        await db.practiceFavorite.deleteMany({ where: { userId, practiceCode: code } })
      }
    },

    async setExclusion(userId, code, excluded) {
      if (excluded) {
        await db.practiceExclusion.upsert({
          where: { userId_practiceCode: { userId, practiceCode: code } },
          create: { userId, practiceCode: code },
          update: {},
        })
      } else {
        await db.practiceExclusion.deleteMany({ where: { userId, practiceCode: code } })
      }
    },

    async recommendations(userId, limit) {
      const rows = await db.recommendation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { practiceCode: true },
      })
      return rows.map((row) => row.practiceCode)
    },

    async recordRecommendation(input) {
      await db.recommendation.create({
        data: {
          userId: input.userId,
          practiceCode: input.practiceCode,
          rulesVersion: RECOMMENDATION_RULES_VERSION,
          need: input.need,
          minutesAvailable: input.minutesAvailable,
          reason: input.reason,
        },
      })
    },

    async listSessions(userId, range) {
      const rows = await db.practiceSession.findMany({
        where: {
          userId,
          ...(range.from ? { dateKey: { gte: range.from } } : {}),
          ...(range.to ? { dateKey: { lte: range.to } } : {}),
        },
        orderBy: { startedAt: 'desc' },
        take: 200,
      })
      return rows.map(toSessionDto)
    },

    async sessionsStartedToday(userId, dateKey) {
      const rows = await db.practiceSession.findMany({
        where: { userId, dateKey },
        select: { practiceCode: true },
      })
      return rows.map((row) => row.practiceCode)
    },

    async recentDistinctPracticeCodes(userId, dateKey) {
      const rows = await db.practiceSession.findMany({
        where: { userId, dateKey },
        orderBy: { startedAt: 'desc' },
        select: { practiceCode: true },
        take: 20,
      })
      return rows.map((row) => row.practiceCode)
    },

    async createSession(input) {
      const row = await db.practiceSession.create({
        data: {
          userId: input.userId,
          practiceCode: input.practiceCode,
          practiceVersion: input.practiceVersion,
          mode: input.mode,
          source: input.source,
          dateKey: input.dateKey,
        },
      })
      return toSessionDto(row)
    },

    async findOwnedSession(userId, sessionId) {
      const row = await db.practiceSession.findFirst({ where: { id: sessionId, userId } })
      return row ? toSessionDto(row) : null
    },

    async completeSession(input) {
      const updated = await db.practiceSession.updateMany({
        where: { id: input.sessionId, userId: input.userId, status: 'started' },
        data: {
          status: input.outcome,
          completedAt: new Date(),
          durationSeconds: input.durationSeconds ?? null,
        },
      })
      if (updated.count === 0) return null
      const row = await db.practiceSession.findFirst({
        where: { id: input.sessionId, userId: input.userId },
      })
      return row ? toSessionDto(row) : null
    },

    async abandonSession(userId, sessionId) {
      await db.practiceSession.updateMany({
        where: { id: sessionId, userId, status: 'started' },
        data: { status: 'abandoned', completedAt: new Date() },
      })
    },

    async saveFeedback(userId, sessionId, feedback) {
      await db.practiceFeedback.upsert({
        where: { sessionId },
        create: {
          sessionId,
          tried: feedback.tried,
          effect: feedback.effect,
          feasible: feedback.feasible,
          comment: feedback.comment ?? null,
          complaint: feedback.complaint ?? null,
        },
        update: {
          tried: feedback.tried,
          effect: feedback.effect,
          feasible: feedback.feasible,
          comment: feedback.comment ?? null,
          complaint: feedback.complaint ?? null,
        },
      })
    },
  }
}

function normalize(value: string): string {
  return value.toLowerCase().replace('ё', 'е').trim()
}

function toPracticeDto(row: VersionRow): PracticeDto {
  return {
    code: row.practice.code,
    version: row.version,
    title: row.title,
    summary: row.summary,
    category: row.category as PracticeDto['category'],
    tags: row.tags,
    estimatedMinutes: row.estimatedMinutes,
    effort: row.effort as PracticeDto['effort'],
    contexts: row.contexts as PracticeDto['contexts'],
    requirements: row.requirements,
    exclusions: row.exclusions as PracticeDto['exclusions'],
    steps: (row.steps as PracticeDto['steps']) ?? [],
    easierVariant: row.easierVariant,
    alternativeCodes: row.alternativeCodes,
    stopGuidance: row.stopGuidance,
    reviewStatus: row.reviewStatus as PracticeDto['reviewStatus'],
    publishedAt: row.publishedAt?.toISOString() ?? null,
  }
}

type SessionRow = {
  id: string
  practiceCode: string
  practiceVersion: number
  status: string
  mode: string
  source: string
  dateKey: string
  startedAt: Date
  completedAt: Date | null
  durationSeconds: number | null
}

function toSessionDto(row: SessionRow): SessionDto {
  return {
    id: row.id,
    practiceCode: row.practiceCode,
    practiceVersion: row.practiceVersion,
    status: row.status,
    mode: row.mode,
    source: row.source,
    dateKey: row.dateKey,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    durationSeconds: row.durationSeconds,
  }
}
