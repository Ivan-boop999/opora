import type { Preferences } from '@opora/contracts'

import type { DbClient } from '../../../db'
import type { PreferencesRecord, PreferencesRepository } from '../application/preferences-service'

const defaults: Preferences = {
  theme: 'system',
  reduceMotion: false,
  soundEnabled: false,
  hapticsEnabled: true,
  language: 'ru',
  timezone: 'Europe/Moscow',
  country: null,
  pacePreset: 'varied',
  restrictions: [],
  gamificationVisible: true,
  eveningTimeMinutes: null,
  onboarding: {},
}

type Row = {
  theme: string
  reduceMotion: boolean
  soundEnabled: boolean
  hapticsEnabled: boolean
  language: string
  timezone: string
  country: string | null
  pacePreset: string
  restrictions: string[]
  gamificationVisible: boolean
  eveningTimeMinutes: number | null
  onboardingState: unknown
  onboardingDoneAt: Date | null
}

export function createPrismaPreferencesRepository(db: DbClient): PreferencesRepository {
  return {
    async get(userId) {
      const row = await db.userPreferences.findUnique({ where: { userId } })
      return row ? toRecord(row) : { ...defaults, onboardingDone: false }
    },

    async update(userId, patch) {
      const row = await db.userPreferences.upsert({
        where: { userId },
        create: {
          userId,
          ...toColumnPatch(patch),
        },
        update: toColumnPatch(patch),
      })
      return toRecord(row)
    },

    async markOnboardingDone(userId) {
      await db.userPreferences.upsert({
        where: { userId },
        create: { userId, onboardingDoneAt: new Date() },
        update: { onboardingDoneAt: new Date() },
      })
    },

    async consents(userId) {
      const rows = await db.userConsent.findMany({
        where: { userId },
        orderBy: { grantedAt: 'asc' },
      })
      return rows.map((row) => ({
        purpose: row.purpose,
        version: row.version,
        grantedAt: row.grantedAt.toISOString(),
      }))
    },

    async grantConsent(userId, purpose, version) {
      await db.userConsent.upsert({
        where: { userId_purpose: { userId, purpose } },
        create: { userId, purpose, version },
        update: { version, grantedAt: new Date() },
      })
    },
  }
}

function toColumnPatch(patch: Partial<Preferences>) {
  const columns: Record<string, unknown> = {}
  if (patch.theme !== undefined) columns.theme = patch.theme
  if (patch.reduceMotion !== undefined) columns.reduceMotion = patch.reduceMotion
  if (patch.soundEnabled !== undefined) columns.soundEnabled = patch.soundEnabled
  if (patch.hapticsEnabled !== undefined) columns.hapticsEnabled = patch.hapticsEnabled
  if (patch.language !== undefined) columns.language = patch.language
  if (patch.timezone !== undefined) columns.timezone = patch.timezone
  if (patch.country !== undefined) columns.country = patch.country
  if (patch.pacePreset !== undefined) columns.pacePreset = patch.pacePreset
  if (patch.restrictions !== undefined) columns.restrictions = patch.restrictions
  if (patch.gamificationVisible !== undefined)
    columns.gamificationVisible = patch.gamificationVisible
  if (patch.eveningTimeMinutes !== undefined)
    columns.eveningTimeMinutes = patch.eveningTimeMinutes
  if (patch.onboarding !== undefined) columns.onboardingState = patch.onboarding
  return columns
}

function toRecord(row: Row): PreferencesRecord {
  return {
    theme: row.theme as Preferences['theme'],
    reduceMotion: row.reduceMotion,
    soundEnabled: row.soundEnabled,
    hapticsEnabled: row.hapticsEnabled,
    language: row.language,
    timezone: row.timezone,
    country: row.country,
    pacePreset: row.pacePreset as Preferences['pacePreset'],
    restrictions: row.restrictions as Preferences['restrictions'],
    gamificationVisible: row.gamificationVisible,
    eveningTimeMinutes: row.eveningTimeMinutes,
    onboarding: (row.onboardingState ?? {}) as Preferences['onboarding'],
    onboardingDone: row.onboardingDoneAt !== null,
  }
}
