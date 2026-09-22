import {
  practiceListQuerySchema,
  practiceListSchema,
  sessionFeedbackSchema,
  sessionStartSchema,
  type PracticeDto,
  type RewardResult,
  type SessionDto,
} from '@opora/contracts'
import type { z } from 'zod'

import { recommend, RECOMMENDATION_RULES_VERSION } from './recommendation-engine'

export type CatalogFilters = z.infer<typeof practiceListQuerySchema>

export type PracticesRepository = {
  listPublished(input: CatalogFilters & { demo: boolean }): Promise<PracticeDto[]>
  findByCode(code: string, options?: { demo: boolean }): Promise<PracticeDto | null>
  favorites(userId: string): Promise<string[]>
  exclusions(userId: string): Promise<string[]>
  setFavorite(userId: string, code: string, favorite: boolean): Promise<void>
  setExclusion(userId: string, code: string, excluded: boolean): Promise<void>
  recommendations(userId: string, limit: number): Promise<string[]>
  recordRecommendation(input: {
    userId: string
    practiceCode: string
    need: string | null
    minutesAvailable: number | null
    reason: string
  }): Promise<void>
  sessionsStartedToday(userId: string, dateKey: string): Promise<string[]>
  listSessions(userId: string, range: { from?: string; to?: string }): Promise<SessionDto[]>
  recentDistinctPracticeCodes(userId: string, dateKey: string): Promise<string[]>
  createSession(input: {
    userId: string
    practiceCode: string
    practiceVersion: number
    mode: string
    source: string
    dateKey: string
  }): Promise<SessionDto>
  findOwnedSession(userId: string, sessionId: string): Promise<SessionDto | null>
  completeSession(input: {
    userId: string
    sessionId: string
    outcome: 'completed' | 'partial' | 'skipped'
    durationSeconds?: number
  }): Promise<SessionDto | null>
  abandonSession(userId: string, sessionId: string): Promise<void>
  saveFeedback(
    userId: string,
    sessionId: string,
    feedback: z.infer<typeof sessionFeedbackSchema>,
  ): Promise<void>
}

export type SessionRewardHooks = {
  /** Called once per completed/partial session with a unique basis. */
  onSessionFinished: (input: {
    userId: string
    sessionId: string
    dateKey: string
    distinctActionToday: boolean
  }) => Promise<RewardResult | null>
  onTriedEasier: (userId: string) => Promise<unknown>
}

export class PracticesService {
  constructor(
    private readonly repository: PracticesRepository,
    private readonly deps: {
      dateKeyNow: (userId: string) => Promise<string>
      rewards: SessionRewardHooks
    },
  ) {}

  list(userId: string, filters: CatalogFilters) {
    return this.repository.listPublished({ ...filters, demo: filters.demo ?? false }).then(async (items) => {
      const favorites = new Set(await this.repository.favorites(userId))
      const exclusions = new Set(await this.repository.exclusions(userId))
      const enriched = items
        .filter((practice) => !exclusions.has(practice.code))
        .map((practice) => ({ ...practice, isFavorite: favorites.has(practice.code) }))
      return practiceListSchema.parse({ items: enriched, total: enriched.length })
    })
  }

  async byCode(userId: string, code: string, options?: { demo: boolean }) {
    const practice = await this.repository.findByCode(code, options)
    if (!practice) return null
    const favorites = new Set(await this.repository.favorites(userId))
    return { ...practice, isFavorite: favorites.has(practice.code) }
  }

  async recommend(userId: string, input: { need?: string; minutes?: number; activeProgramPracticeCode?: string | null }) {
    const dateKey = await this.deps.dateKeyNow(userId)
    const [practices, favorites, exclusions, lastShown, recentSessions] = await Promise.all([
      this.repository.listPublished({ demo: false }),
      this.repository.favorites(userId),
      this.repository.exclusions(userId),
      this.repository.recommendations(userId, 5),
      this.repository.recentDistinctPracticeCodes(userId, dateKey),
    ])

    const decision = recommend({
      practices,
      need: (input.need ?? undefined) as never,
      minutesAvailable: input.minutes,
      excludedCodes: new Set(exclusions),
      favoriteCodes: new Set(favorites),
      restrictions: [],
      lastShownCodes: lastShown,
      recentSessionCodes: recentSessions,
      activeProgramPracticeCode: input.activeProgramPracticeCode ?? null,
    })
    if (!decision) return null

    const favoriteSet = new Set(favorites)
    await this.repository.recordRecommendation({
      userId,
      practiceCode: decision.practice.code,
      need: input.need ?? null,
      minutesAvailable: input.minutes ?? null,
      reason: decision.reason,
    })

    return {
      practice: { ...decision.practice, isFavorite: favoriteSet.has(decision.practice.code) },
      reason: decision.reason,
      rulesVersion: RECOMMENDATION_RULES_VERSION,
      alternatives: decision.alternatives.map((practice) => ({
        ...practice,
        isFavorite: favoriteSet.has(practice.code),
      })),
    }
  }

  async setFavorite(userId: string, code: string, favorite: boolean) {
    if (!(await this.repository.findByCode(code))) return false
    await this.repository.setFavorite(userId, code, favorite)
    return true
  }

  async setExclusion(userId: string, code: string, excluded: boolean) {
    if (!(await this.repository.findByCode(code))) return false
    await this.repository.setExclusion(userId, code, excluded)
    return true
  }

  listSessions(userId: string, range: { from?: string; to?: string }) {
    return this.repository.listSessions(userId, range)
  }

  async startSession(userId: string, input: z.infer<typeof sessionStartSchema>) {
    const practice = await this.repository.findByCode(input.practiceCode)
    if (!practice || (practice.reviewStatus !== 'published' && practice.reviewStatus !== 'draft')) {
      return null
    }
    return this.repository.createSession({
      userId,
      practiceCode: practice.code,
      practiceVersion: practice.version,
      mode: input.mode,
      source: input.source,
      dateKey: await this.deps.dateKeyNow(userId),
    })
  }

  /**
   * Idempotent finish: a completed session stays completed; a repeated request
   * returns the stored session and grants nothing new (the reward basis is the
   * session id, unique in the ledger).
   */
  async completeSession(
    userId: string,
    sessionId: string,
    input: { outcome: 'completed' | 'partial' | 'skipped'; durationSeconds?: number },
  ) {
    const existing = await this.repository.findOwnedSession(userId, sessionId)
    if (!existing) return { error: 'not_found' as const }
    if (existing.status !== 'started') {
      return { session: existing, reward: null }
    }

    const session = await this.repository.completeSession({
      userId,
      sessionId,
      outcome: input.outcome,
      durationSeconds: input.durationSeconds,
    })
    if (!session) return { error: 'not_found' as const }

    let reward: RewardResult | null = null
    if (input.outcome === 'completed' || input.outcome === 'partial') {
      const codesToday = await this.repository.sessionsStartedToday(
        userId,
        session.dateKey,
      )
      reward = await this.deps.rewards.onSessionFinished({
        userId,
        sessionId,
        dateKey: session.dateKey,
        distinctActionToday: codesToday.filter((code, index, all) => all.indexOf(code) === index).length > 1,
      })
    }
    return { session, reward }
  }

  async abandonSession(userId: string, sessionId: string) {
    await this.repository.abandonSession(userId, sessionId)
  }

  async leaveFeedback(userId: string, sessionId: string, feedback: z.infer<typeof sessionFeedbackSchema>) {
    const session = await this.repository.findOwnedSession(userId, sessionId)
    if (!session) return false
    await this.repository.saveFeedback(userId, sessionId, feedback)
    if (feedback.feasible === 'wanted-easier') {
      await this.deps.rewards.onTriedEasier(userId)
    }
    return true
  }
}
