import { checkInInputSchema, type CheckInDto } from '@opora/contracts'
import type { z } from 'zod'

import type { DbClient } from '../../../db'
import type { CheckInRepository } from '../application/checkin-service'

type Input = z.infer<typeof checkInInputSchema>

export function createPrismaCheckInRepository(db: DbClient): CheckInRepository {
  return {
    async create({ userId, data, dateKey }) {
      const row = await db.checkIn.create({
        data: {
          userId,
          mood: data.mood ?? null,
          energy: data.energy ?? null,
          tension: data.tension ?? null,
          emotions: data.emotions ?? [],
          context: data.context ?? null,
          sleepQuality: data.sleepQuality ?? null,
          sleepHours: data.sleepHours ?? null,
          note: data.note ?? null,
          need: data.need ?? null,
          dateKey,
        },
      })
      return toDto(row)
    },

    async list(userId, range) {
      const rows = await db.checkIn.findMany({
        where: {
          userId,
          ...(range.from ? { dateKey: { gte: range.from } } : {}),
          ...(range.to ? { dateKey: { lte: range.to } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
      return rows.map(toDto)
    },

    async findOwned(userId, id) {
      const row = await db.checkIn.findFirst({ where: { id, userId } })
      return row ? toDto(row) : null
    },

    async update(userId, id, data) {
      const row = await db.checkIn.updateMany({
        where: { id, userId },
        data: {
          ...(data.mood !== undefined ? { mood: data.mood } : {}),
          ...(data.energy !== undefined ? { energy: data.energy } : {}),
          ...(data.tension !== undefined ? { tension: data.tension } : {}),
          ...(data.emotions !== undefined ? { emotions: data.emotions } : {}),
          ...(data.context !== undefined ? { context: data.context } : {}),
          ...(data.sleepQuality !== undefined ? { sleepQuality: data.sleepQuality } : {}),
          ...(data.sleepHours !== undefined ? { sleepHours: data.sleepHours } : {}),
          ...(data.note !== undefined ? { note: data.note } : {}),
          ...(data.need !== undefined ? { need: data.need } : {}),
        },
      })
      if (row.count === 0) return null
      const updated = await db.checkIn.findFirst({ where: { id, userId } })
      return updated ? toDto(updated) : null
    },

    async delete(userId, id) {
      const row = await db.checkIn.deleteMany({ where: { id, userId } })
      return row.count > 0
    },
  }
}

type Row = {
  id: string
  mood: number | null
  energy: number | null
  tension: number | null
  emotions: string[]
  context: string | null
  sleepQuality: number | null
  sleepHours: number | null
  note: string | null
  need: string | null
  dateKey: string
  createdAt: Date
  updatedAt: Date
}

export function toDto(row: Row): CheckInDto {
  return {
    id: row.id,
    mood: row.mood,
    energy: row.energy,
    tension: row.tension,
    emotions: row.emotions,
    context: row.context,
    sleepQuality: row.sleepQuality,
    sleepHours: row.sleepHours,
    note: row.note,
    need: row.need,
    dateKey: row.dateKey,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
