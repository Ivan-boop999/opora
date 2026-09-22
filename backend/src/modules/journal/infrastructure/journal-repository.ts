import type { JournalDto } from '@opora/contracts'

import type { DbClient } from '../../../db'
import type {
  JournalInput,
  JournalListFilters,
  JournalRepository,
} from '../application/journal-service'

export function createPrismaJournalRepository(db: DbClient): JournalRepository {
  return {
    async create(userId, input, dateKey) {
      const row = await db.journalEntry.create({
        data: {
          userId,
          kind: input.kind,
          templateKey: input.templateKey ?? null,
          body: input.body,
          tags: input.tags,
          isFavorite: input.isFavorite,
          isDraft: input.isDraft,
          checkInId: input.checkInId ?? null,
          sessionCode: input.sessionCode ?? null,
          dateKey,
        },
      })
      return toDto(row)
    },

    async list(userId, filters) {
      const rows = await db.journalEntry.findMany({
        where: {
          userId,
          deletedAt: null,
          ...(filters.favorite ? { isFavorite: true } : {}),
          ...(filters.from ? { dateKey: { gte: filters.from } } : {}),
          ...(filters.to ? { dateKey: { lte: filters.to } } : {}),
          ...(filters.tag ? { tags: { has: filters.tag } } : {}),
        },
        orderBy: { updatedAt: 'desc' },
        take: 300,
      })
      let items = rows.map(toDto)
      if (filters.search) {
        const needle = normalize(filters.search)
        items = items.filter((entry) => normalize(entry.body).includes(needle))
      }
      return items
    },

    async findOwned(userId, id) {
      const row = await db.journalEntry.findFirst({
        where: { id, userId, deletedAt: null },
      })
      return row ? toDto(row) : null
    },

    async update(userId, id, input, expectedEditVersion) {
      const current = await db.journalEntry.findFirst({
        where: { id, userId, deletedAt: null },
      })
      if (!current) return null
      if (current.editVersion !== expectedEditVersion) return 'conflict'

      const row = await db.journalEntry.update({
        where: { id },
        data: {
          ...(input.kind !== undefined ? { kind: input.kind } : {}),
          ...(input.templateKey !== undefined ? { templateKey: input.templateKey } : {}),
          ...(input.body !== undefined ? { body: input.body } : {}),
          ...(input.tags !== undefined ? { tags: input.tags } : {}),
          ...(input.isFavorite !== undefined ? { isFavorite: input.isFavorite } : {}),
          ...(input.isDraft !== undefined ? { isDraft: input.isDraft } : {}),
          editVersion: current.editVersion + 1,
        },
      })
      return toDto(row)
    },

    async softDelete(userId, id) {
      const deleted = await db.journalEntry.updateMany({
        where: { id, userId, deletedAt: null },
        data: { deletedAt: new Date() },
      })
      return deleted.count > 0
    },

    async hardDeleteAll(userId) {
      const deleted = await db.journalEntry.deleteMany({ where: { userId } })
      return deleted.count
    },
  }
}

type Row = {
  id: string
  kind: string
  templateKey: string | null
  body: string
  tags: string[]
  isFavorite: boolean
  isDraft: boolean
  editVersion: number
  checkInId: string | null
  sessionCode: string | null
  dateKey: string
  createdAt: Date
  updatedAt: Date
}

function toDto(row: Row): JournalDto {
  return {
    id: row.id,
    kind: row.kind as JournalDto['kind'],
    templateKey: row.templateKey,
    body: row.body,
    tags: row.tags,
    isFavorite: row.isFavorite,
    isDraft: row.isDraft,
    editVersion: row.editVersion,
    checkInId: row.checkInId,
    sessionCode: row.sessionCode,
    dateKey: row.dateKey,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function normalize(value: string): string {
  return value.toLowerCase().replace('ё', 'е').trim()
}
