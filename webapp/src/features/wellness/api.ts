import type {
  CheckInDto,
  EnrollmentDto,
  FocusDto,
  GardenResponse,
  InsightsResponse,
  JournalDto,
  PracticeDto,
  RecommendationResponse,
  RoutineDto,
  SessionDto,
  SleepDto,
  TodayResponse,
} from '@opora/contracts'
import {
  checkInInputSchema,
  gardenResponseSchema,
  insightsResponseSchema,
  journalInputSchema,
  journalDtoSchema,
  practiceDtoSchema,
  recommendationResponseSchema,
  sessionCompleteResponseSchema,
  sessionResponseSchema,
  todayResponseSchema,
} from '@opora/contracts'

import { z } from 'zod'

import { useAuth } from '@/features/auth'
import type { HttpRequestOptions } from '@/platform/api'

/** Thin typed client over the product endpoints; goes through the auth transport. */
export function useWellnessApi() {
  const { transport } = useAuth()
  return wellnessApi(transport.request)
}

type AuthenticatedRequest = <TSchema extends z.ZodType>(
  path: string,
  schema: TSchema,
  options?: HttpRequestOptions,
) => Promise<z.infer<TSchema>>

export function wellnessApi(request: AuthenticatedRequest) {
  return {
    today: () => request('/api/app/overview/today', todayResponseSchema),
    insights: (period: string) =>
      request(`/api/app/overview/insights?period=${period}`, insightsResponseSchema),

    checkins: (range: { from?: string; to?: string } = {}) =>
      request(
        `/api/app/checkins${rangeQuery(range)}`,
        zShape<{ items: CheckInDto[] }>(),
      ),
    createCheckIn: (input: z.infer<typeof checkInInputSchema>) =>
      request('/api/app/checkins', checkInDtoSchemaLoose, { method: 'POST', body: input }),
    updateCheckIn: (id: string, input: Partial<z.infer<typeof checkInInputSchema>>) =>
      request(`/api/app/checkins/${id}`, checkInDtoSchemaLoose, { method: 'PATCH', body: input }),
    deleteCheckIn: (id: string) =>
      request(`/api/app/checkins/${id}`, zVoid, { method: 'DELETE' }),

    practices: (params: Record<string, string | undefined>) => {
      const query = new URLSearchParams(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== '') as [string, string][],
      )
      return request(`/api/app/practices?${query}`, zShape<{ items: PracticeDto[]; total: number }>())
    },
    practice: (code: string) => request(`/api/app/practices/${code}`, practiceDtoSchema),
    recommendation: (params: { need?: string; minutes?: number }) => {
      const query = new URLSearchParams(
        Object.entries(params).filter(([, v]: [string, unknown]) => v !== undefined) as [string, string][],
      )
      return request(`/api/app/practices/recommendation?${query}`, recommendationResponseSchema)
    },
    setFavorite: (code: string, favorite: boolean) =>
      request(`/api/app/practices/${code}/favorite`, zVoid, {
        method: favorite ? 'POST' : 'DELETE',
      }),
    setExclusion: (code: string, excluded: boolean) =>
      request(`/api/app/practices/${code}/exclusion`, zVoid, {
        method: excluded ? 'POST' : 'DELETE',
      }),

    startSession: (input: { practiceCode: string; mode?: string; source?: string }) =>
      request('/api/app/practices/sessions', sessionResponseSchema, { method: 'POST', body: input }),
    completeSession: (id: string, input: { outcome: string; durationSeconds?: number }) =>
      request(`/api/app/practices/sessions/${id}/complete`, sessionCompleteResponseSchema, {
        method: 'POST',
        body: input,
      }),
    abandonSession: (id: string) =>
      request(`/api/app/practices/sessions/${id}/abandon`, zVoid, { method: 'POST' }),
    leaveFeedback: (
      id: string,
      input: { tried: string; effect: string; feasible: string; comment?: string },
    ) => request(`/api/app/practices/sessions/${id}/feedback`, zVoid, { method: 'POST', body: input }),
    sessions: (range: { from?: string; to?: string } = {}) =>
      request(`/api/app/practices/sessions${rangeQuery(range)}`, zShape<{ items: SessionDto[] }>()),

    garden: () => request('/api/app/garden', gardenResponseSchema),
    plant: (species: string) =>
      request('/api/app/garden/plants', gardenPlantLoose, { method: 'POST', body: { species } }),
    updatePlant: (id: string, patch: { slot?: number; name?: string | null }) =>
      request(`/api/app/garden/plants/${id}`, zVoid, { method: 'PATCH', body: patch }),
    setScene: (scene: string) =>
      request('/api/app/garden/scene', zVoid, { method: 'PUT', body: { scene } }),

    routines: () => request('/api/app/plans/routines', zShape<{ items: RoutineDto[] }>()),
    createRoutine: (input: Record<string, unknown>) =>
      request('/api/app/plans/routines', routineLoose, { method: 'POST', body: input }),
    updateRoutine: (id: string, patch: Record<string, unknown>) =>
      request(`/api/app/plans/routines/${id}`, routineLoose, { method: 'PATCH', body: patch }),
    deleteRoutine: (id: string) => request(`/api/app/plans/routines/${id}`, zVoid, { method: 'DELETE' }),
    setRoutineOccurrence: (id: string, dateKey: string, status: string) =>
      request(`/api/app/plans/routines/${id}/occurrences/${dateKey}`, zVoid, {
        method: 'POST',
        body: { status },
      }),
    pauseRoutine: (id: string, paused: boolean) =>
      request(`/api/app/plans/routines/${id}/${paused ? 'pause' : 'resume'}`, routineLoose, { method: 'POST' }),

    programs: () => request('/api/app/plans/programs', z.custom<{ items: { code: string; title: string; goal: string; audience: string; daysCount: number }[] }>(() => true)),
    programEnrollment: () =>
      request('/api/app/plans/program-enrollment', zShape<{ enrollment: EnrollmentDto | null }>()),
    enrollProgram: (code: string) =>
      request(`/api/app/plans/programs/${code}/enroll`, enrollmentLoose, { method: 'POST' }),
    pauseProgram: () => request('/api/app/plans/program-enrollment/pause', zVoid, { method: 'POST' }),
    resumeProgram: () => request('/api/app/plans/program-enrollment/resume', zVoid, { method: 'POST' }),
    dropProgram: () => request('/api/app/plans/program-enrollment/drop', zVoid, { method: 'POST' }),
    logProgramDay: (status: string) =>
      request('/api/app/plans/program-enrollment/day', zShape<{ enrollment: EnrollmentDto; finished: boolean }>(), {
        method: 'POST',
        body: { status },
      }),

    startFocus: (input: { intention: string; plannedMinutes: number }) =>
      request('/api/app/plans/focus', zShape<{ focus: FocusDto }>(), { method: 'POST', body: input }),
    focusMark: (id: string, mark: { at: string; type: string }) =>
      request(`/api/app/plans/focus/${id}/marks`, zVoid, { method: 'POST', body: mark }),
    finishFocus: (id: string, status: string) =>
      request(`/api/app/plans/focus/${id}/finish`, zShape<{ focus: FocusDto }>(), {
        method: 'POST',
        body: { status },
      }),
    sleepToday: (input: { quality: number; bedAt?: string | null; wakeAt?: string | null }) => {
      const dateKey = localDateKey()
      return request(`/api/app/plans/sleep/${dateKey}`, sleepLoose, { method: 'PUT', body: input })
    },
    sleepList: (range: { from?: string; to?: string } = {}) =>
      request(`/api/app/plans/sleep${rangeQuery(range)}`, zShape<{ items: SleepDto[] }>()),

    journal: (filters: { search?: string; tag?: string; favorite?: boolean } = {}) => {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, v]: [string, unknown]) => Boolean(v)) as [string, string][],
      )
      return request(`/api/app/journal?${query}`, zShape<{ items: JournalDto[] }>())
    },
    createJournal: (input: z.infer<typeof journalInputSchema>) =>
      request('/api/app/journal', journalDtoSchema, { method: 'POST', body: input }),
    updateJournal: (id: string, input: Record<string, unknown>) =>
      request(`/api/app/journal/${id}`, journalDtoSchema, { method: 'PATCH', body: input }),
    deleteJournal: (id: string) => request(`/api/app/journal/${id}`, zVoid, { method: 'DELETE' }),
    deleteAllJournal: () => request('/api/app/journal/all', zShape<{ deleted: number }>(), { method: 'DELETE' }),

    supportResources: (country?: string) =>
      request(`/api/app/support/resources${country ? `?country=${country}` : ''}`, zShape<{ items: unknown[] }>()),

    preferences: () =>
      request('/api/app/preferences', preferencesLoose),
    updatePreferences: (patch: Record<string, unknown>) =>
      request('/api/app/preferences', preferencesLoose, { method: 'PUT', body: patch }),
    finishOnboarding: (patch: Record<string, unknown>) =>
      request('/api/app/preferences/onboarding/finish', preferencesLoose, {
        method: 'POST',
        body: patch,
      }),
    grantConsent: (purpose: string, version: number) =>
      request('/api/app/preferences/consents', zVoid, { method: 'POST', body: { purpose, version } }),
  }
}

// --- small schema helpers ------------------------------------------------------

const zVoid = z.unknown()
const zShape = <T>() => z.custom<T>(() => true)
const checkInDtoSchemaLoose = z.custom<CheckInDto>(() => true)
const gardenPlantLoose = z.custom<{ id: string; species: string; stage: number; slot: number }>(() => true)
const routineLoose = z.custom<RoutineDto>(() => true)
const enrollmentLoose = z.custom<EnrollmentDto>(() => true)
const sleepLoose = z.custom<SleepDto>(() => true)
const preferencesLoose = z.custom<{
  preferences: {
    theme: string
    language: string
    timezone: string
    country: string | null
    pacePreset: string
    restrictions: string[]
    gamificationVisible: boolean
    eveningTimeMinutes: number | null
    reduceMotion: boolean
    soundEnabled: boolean
    hapticsEnabled: boolean
    onboarding: { goals?: string[]; step?: string; paceChosen?: boolean; privacyAccepted?: boolean }
  }
  onboardingDone: boolean
}>(() => true)

function rangeQuery(range: { from?: string; to?: string }) {
  const query = new URLSearchParams()
  if (range.from) query.set('from', range.from)
  if (range.to) query.set('to', range.to)
  const text = query.toString()
  return text ? `?${text}` : ''
}

export function localDateKey(timezone?: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

export type { InsightsResponse, GardenResponse, TodayResponse, RecommendationResponse }
