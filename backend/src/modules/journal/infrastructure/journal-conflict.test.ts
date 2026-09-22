import { describe, expect, test } from 'bun:test'

import { JournalFailure, JournalService } from '../application/journal-service'

/** §32.10: конфликт редакций не затирает более новый текст молча. */
describe('journal optimistic concurrency', () => {
  function fakeRepository(storedEditVersion: number) {
    return {
      create: async () => {
        throw new Error('unused')
      },
      list: async () => [],
      findOwned: async () => null,
      update: async (_userId: string, _id: string, _input: unknown, expectedEditVersion: number) =>
        expectedEditVersion === storedEditVersion
          ? ({
              id: 'e1',
              kind: 'free',
              templateKey: null,
              body: 'новый текст',
              tags: [],
              isFavorite: false,
              isDraft: false,
              editVersion: storedEditVersion + 1,
              checkInId: null,
              sessionCode: null,
              dateKey: '2026-09-22',
              createdAt: '2026-09-22T00:00:00Z',
              updatedAt: '2026-09-22T00:00:00Z',
            } as const)
          : ('conflict' as const),
      softDelete: async () => true,
      hardDeleteAll: async () => 0,
    }
  }

  test('a stale edit version yields a conflict, not a silent overwrite', async () => {
    const service = new JournalService(fakeRepository(3) as never, {
      dateKeyNow: async () => '2026-09-22',
      onCreated: async () => undefined,
    })
    const outcome = service.update('u1', 'e1', { body: 'переписано с телефона' }, 2)
    await expect(outcome).rejects.toBeInstanceOf(JournalFailure)
    await expect(outcome).rejects.toMatchObject({ kind: 'conflict' })
  })

  test('the current edit version applies and bumps', async () => {
    const service = new JournalService(fakeRepository(3) as never, {
      dateKeyNow: async () => '2026-09-22',
      onCreated: async () => undefined,
    })
    const updated = await service.update('u1', 'e1', { body: 'актуально' }, 3)
    expect(updated.editVersion).toBe(4)
  })
})
