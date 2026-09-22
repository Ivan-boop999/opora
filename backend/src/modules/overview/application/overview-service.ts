import {
  insightsResponseSchema,
  todayResponseSchema,
  type CheckInDto,
  type EnrollmentDto,
  type PracticeDto,
  type RecommendationResponse,
  type RoutineDto,
} from '@opora/contracts'
import type { z } from 'zod'

import { dateKeyMinusDays } from '../../../local-date'

export type OverviewPorts = {
  dateKeyNow: (userId: string) => Promise<string>
  minutesNow: (userId: string) => Promise<number>
  latestCheckIn(userId: string, dateKey: string): Promise<CheckInDto | null>
  recommend(userId: string, input: {
    need?: string
    minutes?: number
    activeProgramPracticeCode?: string | null
  }): Promise<RecommendationResponse | null>
  routines(userId: string): Promise<RoutineDto[]>
  activeEnrollment(userId: string): Promise<EnrollmentDto | null>
  gardenSummary(userId: string, dateKey: string): Promise<{
    visible: boolean
    totalDrops: number
    todayDrops: number
    plantStage: number | null
    plantSpecies: string | null
  } | null>
  favorites(userId: string, limit: number): Promise<PracticeDto[]>
  preferences(userId: string): Promise<{
    gamificationVisible: boolean
    onboardingDone: boolean
    pacePreset: string
    eveningTimeMinutes: number | null
  }>
  insightsData(
    userId: string,
    from: string | null,
    to: string,
  ): Promise<Omit<z.infer<typeof insightsResponseSchema>, 'period' | 'from'>>
}

/** Aggregated "Сегодня" payload: one request for the whole home screen. */
export class OverviewService {
  constructor(private readonly ports: OverviewPorts) {}

  async today(userId: string): Promise<z.infer<typeof todayResponseSchema>> {
    const dateKey = await this.ports.dateKeyNow(userId)
    const minutes = await this.ports.minutesNow(userId)

    const [checkInToday, enrollment, gardenSummary, favorites, preferences] = await Promise.all([
      this.ports.latestCheckIn(userId, dateKey),
      this.ports.activeEnrollment(userId),
      this.ports.gardenSummary(userId, dateKey),
      this.ports.favorites(userId, 3),
      this.ports.preferences(userId),
    ])

    const recommendation = await this.ports.recommend(userId, {
      activeProgramPracticeCode: enrollment?.day?.practiceCode ?? null,
    })

    const greetingPeriod: 'morning' | 'day' | 'evening' | 'night' =
      minutes < 5 * 60 ? 'night' : minutes < 12 * 60 ? 'morning' : minutes < 18 * 60 ? 'day' : 'evening'

    return todayResponseSchema.parse({
      dateKey,
      greetingPeriod,
      checkInToday,
      recommendation,
      routineAnchors: await this.ports.routines(userId),
      activeProgram: enrollment,
      gardenVisible: gardenSummary?.visible ?? true,
      gardenSummary: gardenSummary?.visible
        ? {
            totalDrops: gardenSummary.totalDrops,
            todayDrops: gardenSummary.todayDrops,
            plantStage: gardenSummary.plantStage,
            plantSpecies: gardenSummary.plantSpecies,
          }
        : null,
      favorites,
    })
  }

  async insights(userId: string, period: '7' | '30' | '90' | 'all') {
    const dateKey = await this.ports.dateKeyNow(userId)
    const from = period === 'all' ? null : dateKeyMinusDays(dateKey, Number(period))
    const data = await this.ports.insightsData(userId, from, dateKey)
    return insightsResponseSchema.parse({ period, from, ...data })
  }
}
