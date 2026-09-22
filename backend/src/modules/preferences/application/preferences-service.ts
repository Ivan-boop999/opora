import {
  consentGrantSchema,
  preferencesSchema,
  preferencesUpdateSchema,
  type Preferences,
} from '@opora/contracts'
import { z } from 'zod'

export type PreferencesRecord = Preferences & { onboardingDone: boolean }

export type PreferencesRepository = {
  get(userId: string): Promise<PreferencesRecord>
  update(userId: string, patch: Partial<Preferences>): Promise<PreferencesRecord>
  markOnboardingDone(userId: string): Promise<void>
  consents(userId: string): Promise<{ purpose: string; version: number; grantedAt: string }[]>
  grantConsent(userId: string, purpose: string, version: number): Promise<void>
}

export const consentGrantInput = consentGrantSchema
export const preferencesUpdateInput = preferencesUpdateSchema
export const preferencesFullSchema = preferencesSchema

export class PreferencesService {
  constructor(private readonly repository: PreferencesRepository) {}

  get(userId: string) {
    return this.repository.get(userId)
  }

  async update(userId: string, patch: z.infer<typeof preferencesUpdateSchema>) {
    return this.repository.update(userId, patch as Partial<Preferences>)
  }

  async finishOnboarding(userId: string, patch: z.infer<typeof preferencesUpdateSchema>) {
    const updated = await this.repository.update(userId, patch as Partial<Preferences>)
    await this.repository.markOnboardingDone(userId)
    return updated
  }

  consents(userId: string) {
    return this.repository.consents(userId)
  }

  async grant(userId: string, input: z.infer<typeof consentGrantSchema>) {
    await this.repository.grantConsent(userId, input.purpose, input.version)
    return this.repository.consents(userId)
  }

  /** The timezone a user's local days are computed in. */
  async timezone(userId: string): Promise<string> {
    return (await this.repository.get(userId)).timezone
  }
}
