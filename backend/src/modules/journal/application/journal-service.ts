import { journalInputSchema, type JournalDto } from '@opora/contracts'
import type { z } from 'zod'

export type JournalInput = z.infer<typeof journalInputSchema>

export type JournalListFilters = {
  search?: string
  tag?: string
  favorite?: boolean
  from?: string
  to?: string
}

export type JournalRepository = {
  create(userId: string, input: JournalInput, dateKey: string): Promise<JournalDto>
  list(userId: string, filters: JournalListFilters): Promise<JournalDto[]>
  findOwned(userId: string, id: string): Promise<JournalDto | null>
  /**
   * Optimistic concurrency: the update only applies when editVersion matches,
   * so two devices cannot silently overwrite each other's newer text.
   */
  update(
    userId: string,
    id: string,
    input: Partial<JournalInput>,
    expectedEditVersion: number,
  ): Promise<JournalDto | 'conflict' | null>
  softDelete(userId: string, id: string): Promise<boolean>
  hardDeleteAll(userId: string): Promise<number>
}

export class JournalFailure extends Error {
  constructor(
    public readonly kind: 'not_found' | 'conflict',
    message: string,
  ) {
    super(message)
  }
}

export class JournalService {
  constructor(
    private readonly repository: JournalRepository,
    private readonly deps: {
      dateKeyNow: (userId: string) => Promise<string>
      onCreated: (input: { userId: string; dateKey: string }) => Promise<unknown>
    },
  ) {}

  async create(userId: string, input: JournalInput) {
    const dateKey = input.dateKey ?? (await this.deps.dateKeyNow(userId))
    const created = await this.repository.create(userId, input, dateKey)
    if (!input.isDraft) {
      await this.deps.onCreated({ userId, dateKey })
    }
    return created
  }

  list(userId: string, filters: JournalListFilters) {
    return this.repository.list(userId, filters)
  }

  find(userId: string, id: string) {
    return this.repository.findOwned(userId, id)
  }

  async update(userId: string, id: string, input: Partial<JournalInput>, expectedEditVersion: number) {
    const result = await this.repository.update(userId, id, input, expectedEditVersion)
    if (result === null) throw new JournalFailure('not_found', 'Запись не найдена')
    if (result === 'conflict') {
      throw new JournalFailure(
        'conflict',
        'Запись изменилась с другого устройства. Обнови её текст и попробуй ещё раз',
      )
    }
    return result
  }

  async delete(userId: string, id: string) {
    if (!(await this.repository.softDelete(userId, id))) {
      throw new JournalFailure('not_found', 'Запись не найдена')
    }
  }

  deleteAll(userId: string) {
    return this.repository.hardDeleteAll(userId)
  }
}
