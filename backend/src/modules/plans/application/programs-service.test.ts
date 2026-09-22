import { describe, expect, test } from 'bun:test'

import { PlansFailure, ProgramsService } from './plans-service'

/** §32.7: одна активная программа, пауза/возврат не создают дублей. */
describe('program enrollment rules', () => {
  function repository(active: unknown) {
    return {
      listRoutines: async () => [],
      createRoutine: async () => {
        throw new Error('unused')
      },
      findRoutine: async () => null,
      updateRoutine: async () => null,
      deleteRoutine: async () => false,
      setOccurrence: async () => undefined,
      listPrograms: async () => [],
      programByCode: async (code: string) =>
        code === 'known' ? { code: 'known' } : null,
      activeEnrollment: async () => active,
      enroll: async () => {
        throw new Error('unused')
      },
      pauseEnrollment: async () => undefined,
      resumeEnrollment: async () => undefined,
      dropEnrollment: async () => undefined,
      logProgramDay: async () => null,
      startFocus: async () => {
        throw new Error('unused')
      },
      findFocus: async () => null,
      appendFocusMark: async () => undefined,
      finishFocus: async () => null,
      listFocus: async () => [],
      upsertSleep: async () => {
        throw new Error('unused')
      },
      listSleep: async () => [],
    }
  }

  const build = (active: unknown) =>
    new ProgramsService(repository(active) as never, { dateKeyNow: async () => '2026-09-22' })

  test('a second program cannot start while one is active', async () => {
    const service = build({ id: 'en1', status: 'active' })
    await expect(service.enroll('u1', 'known')).rejects.toMatchObject({
      kind: 'already_enrolled',
    })
  })

  test('an unknown program code is rejected explicitly', async () => {
    const service = build(null)
    await expect(service.enroll('u1', 'missing')).rejects.toBeInstanceOf(PlansFailure)
  })

  test('logging a day without an active program fails honestly', async () => {
    const service = build(null)
    await expect(service.logDay('u1', 'done')).rejects.toMatchObject({
      kind: 'no_active_program',
    })
  })
})
