import { z } from 'zod'

// =============================================================================
// Wellness product contracts. Shared vocabulary between backend and webapp.
// Strings the user sees are ru-first; keys stay machine-stable.
// =============================================================================

export const themeSettingSchema = z.enum(['system', 'light', 'dark'])
export const pacePresetSchema = z.enum(['m1-3', 'm5-10', 'm10-20', 'varied'])
export const restrictionSchema = z.enum([
  'seated',
  'no-breathwork',
  'no-sound',
  'no-social',
])
export const needSchema = z.enum([
  'calm-down',
  'move',
  'start',
  'rest',
  'connect',
  'understand',
])
export const emotionSchema = z.enum([
  'calm',
  'anxiety',
  'irritation',
  'sadness',
  'joy',
  'interest',
  'emptiness',
  'confusion',
  'other',
])
export const checkInContextSchema = z.enum([
  'work',
  'home',
  'relationships',
  'study',
  'loneliness',
  'rest',
  'transit',
])
export const practiceCategorySchema = z.enum([
  'grounding',
  'movement',
  'starting',
  'rest',
  'pleasant',
  'connection',
  'attention',
  'reflection',
])
export const effortSchema = z.enum(['low', 'medium'])
export const practiceContextTagSchema = z.enum([
  'home',
  'outside',
  'workplace',
  'sitting',
  'standing',
  'sound',
  'no-sound',
  'evening',
])
export const reviewStatusSchema = z.enum(['draft', 'published', 'retired'])
export const sessionOutcomeSchema = z.enum(['completed', 'partial', 'skipped'])
export const feedbackTriedSchema = z.enum(['yes', 'partial', 'no'])
export const feedbackEffectSchema = z.enum(['easier', 'same', 'harder', 'declined'])
export const feedbackFeasibleSchema = z.enum(['yes', 'wanted-easier'])
export const timeOfDaySchema = z.enum(['morning', 'day', 'evening'])
export const routineOccurrenceStatusSchema = z.enum([
  'pending',
  'done',
  'partial',
  'moved',
  'skipped',
])
export const programEnrollmentStatusSchema = z.enum([
  'active',
  'paused',
  'completed',
  'dropped',
])
export const focusStatusSchema = z.enum(['active', 'paused', 'completed', 'stopped'])
export const gardenSpeciesSchema = z.enum([
  'sprout',
  'fern',
  'bush',
  'blossom',
  'succulent',
  'tree',
])
export const gardenSceneSchema = z.enum(['dawn', 'day', 'dusk'])
export const journalKindSchema = z.enum(['free', 'structured'])

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

// --- Preferences ---------------------------------------------------------------

export const preferencesSchema = z.object({
  theme: themeSettingSchema,
  reduceMotion: z.boolean(),
  soundEnabled: z.boolean(),
  hapticsEnabled: z.boolean(),
  language: z.string().min(2).max(8),
  timezone: z.string().min(1).max(64),
  country: z.string().min(2).max(2).nullable(),
  pacePreset: pacePresetSchema,
  restrictions: z.array(restrictionSchema).max(8),
  gamificationVisible: z.boolean(),
  eveningTimeMinutes: z.number().int().min(0).max(1439).nullable(),
  onboarding: z.object({
    step: z.string().optional(),
    goals: z.array(z.string()).max(7).optional(),
    paceChosen: z.boolean().optional(),
    privacyAccepted: z.boolean().optional(),
  }),
})
export type Preferences = z.infer<typeof preferencesSchema>

export const preferencesUpdateSchema = preferencesSchema.partial()
export const preferencesResponseSchema = z.object({
  preferences: preferencesSchema,
  onboardingDone: z.boolean(),
})

export const consentGrantSchema = z.object({
  purpose: z.enum(['terms', 'age-18', 'data-processing', 'ai-external']),
  version: z.number().int().positive(),
})
export const consentsResponseSchema = z.object({
  consents: z.array(
    z.object({ purpose: z.string(), version: z.number(), grantedAt: z.string() }),
  ),
})

// --- Check-ins -----------------------------------------------------------------

export const checkInInputSchema = z.object({
  mood: z.number().int().min(1).max(5).nullable().optional(),
  energy: z.number().int().min(1).max(5).nullable().optional(),
  tension: z.number().int().min(1).max(5).nullable().optional(),
  emotions: z.array(emotionSchema).max(9).default([]),
  context: checkInContextSchema.nullable().optional(),
  sleepQuality: z.number().int().min(1).max(5).nullable().optional(),
  sleepHours: z.number().min(0).max(24).nullable().optional(),
  note: z.string().max(2000).nullable().optional(),
  need: needSchema.nullable().optional(),
})
export type CheckInInput = z.infer<typeof checkInInputSchema>

export const checkInDtoSchema = z.object({
  id: z.string(),
  mood: z.number().nullable(),
  energy: z.number().nullable(),
  tension: z.number().nullable(),
  emotions: z.array(z.string()),
  context: z.string().nullable(),
  sleepQuality: z.number().nullable(),
  sleepHours: z.number().nullable(),
  note: z.string().nullable(),
  need: z.string().nullable(),
  dateKey: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type CheckInDto = z.infer<typeof checkInDtoSchema>

export const checkInListSchema = z.object({ items: z.array(checkInDtoSchema) })

// --- Practices -------------------------------------------------------------------

export const practiceStepSchema = z.object({
  text: z.string().min(1).max(500),
  seconds: z.number().int().min(5).max(3600).optional(),
})

export const practiceDtoSchema = z.object({
  code: z.string(),
  version: z.number(),
  title: z.string(),
  summary: z.string(),
  category: practiceCategorySchema,
  tags: z.array(z.string()),
  estimatedMinutes: z.number().int().min(1).max(60),
  effort: effortSchema,
  contexts: z.array(practiceContextTagSchema),
  requirements: z.array(z.string()),
  exclusions: z.array(z.string()),
  steps: z.array(practiceStepSchema).min(1).max(5),
  easierVariant: z.string(),
  alternativeCodes: z.array(z.string()),
  stopGuidance: z.string().nullable(),
  reviewStatus: reviewStatusSchema,
  publishedAt: z.string().nullable(),
  isFavorite: z.boolean().optional(),
})
export type PracticeDto = z.infer<typeof practiceDtoSchema>

export const practiceListQuerySchema = z.object({
  category: practiceCategorySchema.optional(),
  effort: effortSchema.optional(),
  minutesMax: z.coerce.number().int().min(1).max(60).optional(),
  context: practiceContextTagSchema.optional(),
  favorite: z.coerce.boolean().optional(),
  search: z.string().max(120).optional(),
  demo: z.coerce.boolean().optional(),
})
export const practiceListSchema = z.object({
  items: z.array(practiceDtoSchema),
  total: z.number().int(),
})

// --- Recommendations ---------------------------------------------------------------

export const recommendationQuerySchema = z.object({
  need: needSchema.optional(),
  minutes: z.coerce.number().int().min(1).max(60).optional(),
  excludeCode: z.string().max(16).optional(),
})
export const recommendationResponseSchema = z.object({
  practice: practiceDtoSchema,
  reason: z.string(),
  rulesVersion: z.string(),
  alternatives: z.array(practiceDtoSchema),
})
export type RecommendationResponse = z.infer<typeof recommendationResponseSchema>

// --- Practice sessions --------------------------------------------------------------

export const sessionStartSchema = z.object({
  practiceCode: z.string().min(2).max(16),
  mode: z.enum(['normal', 'easier']).default('normal'),
  source: z
    .enum(['recommendation', 'routine', 'program', 'manual', 'support'])
    .default('manual'),
})
export const sessionCompleteSchema = z.object({
  outcome: sessionOutcomeSchema,
  durationSeconds: z.number().int().min(0).max(86400).optional(),
})
export const rewardResultSchema = z.object({
  dropsGranted: z.number().int(),
  todayDrops: z.number().int(),
  totalDrops: z.number().int(),
  plantGrewTo: z
    .object({ plantId: z.string(), species: gardenSpeciesSchema, stage: z.number().int() })
    .nullable(),
  unlockedSpecies: z.array(gardenSpeciesSchema),
})
export const sessionDtoSchema = z.object({
  id: z.string(),
  practiceCode: z.string(),
  practiceVersion: z.number(),
  status: z.string(),
  mode: z.string(),
  source: z.string(),
  dateKey: z.string(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  durationSeconds: z.number().nullable(),
})
export const sessionResponseSchema = z.object({ session: sessionDtoSchema })
export const sessionCompleteResponseSchema = z.object({
  session: sessionDtoSchema,
  reward: rewardResultSchema.nullable(),
})
export const sessionFeedbackSchema = z.object({
  tried: feedbackTriedSchema,
  effect: feedbackEffectSchema,
  feasible: feedbackFeasibleSchema,
  comment: z.string().max(2000).optional(),
  complaint: z.string().max(2000).optional(),
})
export const sessionListSchema = z.object({ items: z.array(sessionDtoSchema) })

// --- Garden -----------------------------------------------------------------------

export const gardenPlantDtoSchema = z.object({
  id: z.string(),
  species: gardenSpeciesSchema,
  stage: z.number().int().min(1).max(5),
  name: z.string().nullable(),
  slot: z.number().int(),
  plantedAt: z.string(),
})
export const gardenResponseSchema = z.object({
  scene: gardenSceneSchema,
  plants: z.array(gardenPlantDtoSchema),
  totalDrops: z.number().int(),
  todayDrops: z.number().int(),
  achievements: z.array(z.object({ key: z.string(), unlockedAt: z.string() })),
  unlockedSpecies: z.array(gardenSpeciesSchema),
  nextGrowthAt: z.number().int().nullable(),
  visible: z.boolean(),
})
export const gardenPlantRequestSchema = z.object({
  species: gardenSpeciesSchema,
})
export const gardenPlantUpdateSchema = z.object({
  slot: z.number().int().min(0).max(7).optional(),
  name: z.string().max(40).nullable().optional(),
})
export const gardenSceneRequestSchema = z.object({ scene: gardenSceneSchema })

// --- Routines -----------------------------------------------------------------------

export const routineInputSchema = z.object({
  title: z.string().min(1).max(120),
  practiceCode: z.string().max(16).nullable().optional(),
  customSteps: z.array(z.object({ text: z.string().min(1).max(300) })).max(5).nullable().optional(),
  easierVariant: z.string().max(500).nullable().optional(),
  timeOfDay: timeOfDaySchema.default('day'),
  timeMinutes: z.number().int().min(0).max(1439).nullable().optional(),
  weekdays: z.array(z.number().int().min(1).max(7)).max(7).default([1, 2, 3, 4, 5, 6, 7]),
  optional: z.boolean().default(true),
  category: practiceCategorySchema.nullable().optional(),
})
export type RoutineInput = z.infer<typeof routineInputSchema>

export const routineDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  practiceCode: z.string().nullable(),
  customSteps: z.array(z.object({ text: z.string() })).nullable(),
  easierVariant: z.string().nullable(),
  timeOfDay: timeOfDaySchema,
  timeMinutes: z.number().nullable(),
  weekdays: z.array(z.number()),
  optional: z.boolean(),
  category: z.string().nullable(),
  startDateKey: z.string(),
  pausedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
  todayStatus: routineOccurrenceStatusSchema.nullable(),
})
export const routineListSchema = z.object({ items: z.array(routineDtoSchema) })
export const routineOccurrenceUpdateSchema = z.object({
  status: z.enum(['done', 'partial', 'moved', 'skipped']),
})

// --- Programs -------------------------------------------------------------------------

export const programDayDtoSchema = z.object({
  dayNumber: z.number().int(),
  intro: z.string(),
  practiceCode: z.string().nullable(),
  alternativePracticeCode: z.string().nullable(),
  customStep: z
    .object({ kind: z.string(), title: z.string(), description: z.string() })
    .nullable(),
  question: z.string().nullable(),
})
export const programDtoSchema = z.object({
  code: z.string(),
  version: z.number(),
  title: z.string(),
  goal: z.string(),
  audience: z.string(),
  daysCount: z.number(),
  days: z.array(programDayDtoSchema),
})
export const programListSchema = z.object({
  items: z.array(programDtoSchema.omit({ days: true })),
})
export const enrollmentDtoSchema = z.object({
  id: z.string(),
  programCode: z.string(),
  programTitle: z.string(),
  status: programEnrollmentStatusSchema,
  currentDay: z.number().int(),
  daysCount: z.number().int(),
  startedAt: z.string(),
  day: programDayDtoSchema.nullable(),
  completedDays: z.array(z.number().int()),
})
export const enrollmentResponseSchema = z.object({ enrollment: enrollmentDtoSchema.nullable() })
export const enrollmentDayRequestSchema = z.object({
  status: z.enum(['done', 'partial', 'skipped']),
})
export const enrollmentDayResponseSchema = z.object({
  enrollment: enrollmentDtoSchema,
  finished: z.boolean(),
})

// --- Focus ------------------------------------------------------------------------------

export const focusStartSchema = z.object({
  intention: z.string().min(1).max(200),
  plannedMinutes: z.number().int().min(1).max(180),
})
export const focusMarkSchema = z.object({
  at: z.string(),
  type: z.enum(['pause', 'resume']),
})
export const focusFinishSchema = z.object({
  status: z.enum(['completed', 'stopped']),
})
export const focusDtoSchema = z.object({
  id: z.string(),
  intention: z.string(),
  plannedMinutes: z.number(),
  status: focusStatusSchema,
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  elapsedSeconds: z.number(),
  dateKey: z.string(),
})
export const focusResponseSchema = z.object({ focus: focusDtoSchema })

// --- Sleep --------------------------------------------------------------------------------

export const sleepInputSchema = z.object({
  quality: z.number().int().min(1).max(5),
  bedAt: z.string().max(5).nullable().optional(),
  wakeAt: z.string().max(5).nullable().optional(),
})
export const sleepDtoSchema = z.object({
  dateKey: z.string(),
  quality: z.number(),
  bedAt: z.string().nullable(),
  wakeAt: z.string().nullable(),
})
export const sleepListSchema = z.object({ items: z.array(sleepDtoSchema) })

// --- Journal --------------------------------------------------------------------------------

export const journalInputSchema = z.object({
  kind: journalKindSchema.default('free'),
  templateKey: z.string().max(64).nullable().optional(),
  body: z.string().min(1).max(20000),
  tags: z.array(z.string().min(1).max(32)).max(10).default([]),
  isDraft: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
  checkInId: z.string().uuid().nullable().optional(),
  sessionCode: z.string().max(16).nullable().optional(),
  dateKey: dateKeySchema.optional(),
})
export type JournalInput = z.infer<typeof journalInputSchema>

export const journalDtoSchema = z.object({
  id: z.string(),
  kind: journalKindSchema,
  templateKey: z.string().nullable(),
  body: z.string(),
  tags: z.array(z.string()),
  isFavorite: z.boolean(),
  isDraft: z.boolean(),
  editVersion: z.number().int(),
  checkInId: z.string().nullable(),
  sessionCode: z.string().nullable(),
  dateKey: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export const journalUpdateSchema = journalInputSchema.partial().extend({
  expectedEditVersion: z.number().int().positive(),
})
export const journalListSchema = z.object({ items: z.array(journalDtoSchema) })

// --- Insights ---------------------------------------------------------------------------------

export const insightsQuerySchema = z.object({
  period: z.enum(['7', '30', '90', 'all']).default('30'),
})
export const insightsResponseSchema = z.object({
  period: z.string(),
  from: z.string().nullable(),
  checkinDays: z.number().int(),
  averages: z
    .object({
      mood: z.number().nullable(),
      energy: z.number().nullable(),
      tension: z.number().nullable(),
    })
    .nullable(),
  daily: z.array(
    z.object({
      dateKey: z.string(),
      mood: z.number().nullable(),
      energy: z.number().nullable(),
      tension: z.number().nullable(),
      actions: z.number().int(),
    }),
  ),
  actionTotals: z.object({
    completed: z.number().int(),
    partial: z.number().int(),
    total: z.number().int(),
  }),
  topPractices: z.array(
    z.object({ code: z.string(), title: z.string(), times: z.number().int() }),
  ),
  effectCounts: z.object({
    easier: z.number().int(),
    same: z.number().int(),
    harder: z.number().int(),
    declined: z.number().int(),
  }),
  observations: z.array(
    z.object({
      practiceCode: z.string(),
      title: z.string(),
      tries: z.number().int(),
      days: z.number().int(),
      easierCount: z.number().int(),
      ratedCount: z.number().int(),
    }),
  ),
  sleepNights: z.number().int(),
  sleepAverage: z.number().nullable(),
  programActive: z
    .object({ title: z.string(), day: z.number(), daysCount: z.number() })
    .nullable(),
  weekly: z
    .object({
      kindActions: z.number().int(),
      checkins: z.number().int(),
      journalEntries: z.number().int(),
      topPractice: z.string().nullable(),
    })
    .nullable(),
})

// --- Support -------------------------------------------------------------------------------------

export const supportResourceDtoSchema = z.object({
  id: z.string(),
  country: z.string(),
  title: z.string(),
  orgUrl: z.string(),
  contacts: z.array(z.object({ label: z.string(), value: z.string() })),
  hours: z.string().nullable(),
  status: z.string(),
  verifiedAt: z.string().nullable(),
})
export const supportListSchema = z.object({ items: z.array(supportResourceDtoSchema) })

// --- Today -----------------------------------------------------------------------------------------

export const todayResponseSchema = z.object({
  dateKey: z.string(),
  greetingPeriod: z.enum(['morning', 'day', 'evening', 'night']),
  checkInToday: checkInDtoSchema.nullable(),
  recommendation: recommendationResponseSchema.nullable(),
  routineAnchors: z.array(routineDtoSchema),
  activeProgram: enrollmentDtoSchema.nullable(),
  gardenVisible: z.boolean(),
  gardenSummary: z
    .object({ totalDrops: z.number().int(), todayDrops: z.number().int(), plantStage: z.number().nullable(), plantSpecies: gardenSpeciesSchema.nullable() })
    .nullable(),
  favorites: z.array(practiceDtoSchema),
})

// --- Telegram auth ---------------------------------------------------------------------------------

export const telegramAuthRequestSchema = z.object({
  initData: z.string().min(16).max(8192),
})

// --- Inferred DTO types -----------------------------------------------------------

export type GardenScene = z.infer<typeof gardenSceneSchema>
export type GardenSpecies = z.infer<typeof gardenSpeciesSchema>
export type GardenPlantDto = z.infer<typeof gardenPlantDtoSchema>
export type RewardResult = z.infer<typeof rewardResultSchema>
export type RoutineDto = z.infer<typeof routineDtoSchema>
export type ProgramDto = z.infer<typeof programDtoSchema>
export type EnrollmentDto = z.infer<typeof enrollmentDtoSchema>
export type FocusDto = z.infer<typeof focusDtoSchema>
export type SleepDto = z.infer<typeof sleepDtoSchema>
export type JournalDto = z.infer<typeof journalDtoSchema>
export type SessionDto = z.infer<typeof sessionDtoSchema>
export type Need = z.infer<typeof needSchema>
export type TimeOfDay = z.infer<typeof timeOfDaySchema>
export type RecommendationQuery = z.infer<typeof recommendationQuerySchema>
export type TodayResponse = z.infer<typeof todayResponseSchema>
export type InsightsResponse = z.infer<typeof insightsResponseSchema>
export type GardenResponse = z.infer<typeof gardenResponseSchema>
