import type { GardenScene, GardenSpecies, GardenPlantDto } from '@opora/contracts'

import type { DbClient } from '../../../db'
import type {
  GardenRepository,
  RewardKind,
} from '../application/garden-service'

export function createPrismaGardenRepository(db: DbClient): GardenRepository {
  return {
    async getPreferencesVisibility(userId) {
      const preferences = await db.userPreferences.findUnique({
        where: { userId },
        select: { gamificationVisible: true },
      })
      return preferences?.gamificationVisible ?? true
    },

    async getScene(userId) {
      const garden = await db.garden.findUnique({
        where: { userId },
        select: { scene: true },
      })
      return (garden?.scene ?? 'day') as GardenScene
    },

    async setScene(userId, scene) {
      await db.garden.upsert({
        where: { userId },
        create: { userId, scene },
        update: { scene },
      })
    },

    async listPlants(userId) {
      const plants = await db.gardenPlant.findMany({
        where: { garden: { userId }, retiredAt: null },
        orderBy: { plantedAt: 'asc' },
      })
      return plants.map(toPlantDto)
    },

    async findFreeSlot(userId) {
      const plants = await db.gardenPlant.findMany({
        where: { garden: { userId }, retiredAt: null },
        select: { slot: true },
      })
      const taken = new Set(plants.map((plant) => plant.slot))
      for (let slot = 0; slot < 8; slot += 1) {
        if (!taken.has(slot)) return slot
      }
      return null
    },

    async plantExists(userId, plantId) {
      const plant = await db.gardenPlant.findFirst({
        where: { id: plantId, garden: { userId } },
        select: { id: true },
      })
      return plant !== null
    },

    async createPlant(input) {
      const garden = await db.garden.upsert({
        where: { userId: input.userId },
        create: { userId: input.userId },
        update: {},
      })
      const plant = await db.gardenPlant.create({
        data: {
          gardenId: garden.id,
          species: input.species,
          slot: input.slot,
          stage: 1,
        },
      })
      return toPlantDto(plant)
    },

    async updatePlant(userId, plantId, patch) {
      await db.gardenPlant.updateMany({
        where: { id: plantId, garden: { userId } },
        data: {
          ...(patch.slot !== undefined ? { slot: patch.slot } : {}),
          ...(patch.name !== undefined ? { name: patch.name } : {}),
        },
      })
    },

    async findGrowingPlant(userId) {
      const plant = await db.gardenPlant.findFirst({
        where: { garden: { userId }, retiredAt: null, stage: { lt: 5 } },
        orderBy: { plantedAt: 'desc' },
      })
      return plant ? toPlantDto(plant) : null
    },

    async growPlant(userId, plantId, stage) {
      await db.gardenPlant.updateMany({
        where: { id: plantId, garden: { userId } },
        data: { stage, grownAt: new Date() },
      })
    },

    async totalDrops(userId) {
      const aggregate = await db.rewardLedger.aggregate({
        where: { userId },
        _sum: { drops: true },
      })
      return aggregate._sum.drops ?? 0
    },

    async todayDrops(userId, dateKey) {
      const aggregate = await db.rewardLedger.aggregate({
        where: { userId, dateKey },
        _sum: { drops: true },
      })
      return aggregate._sum.drops ?? 0
    },

    async ledgerInsert(input) {
      try {
        await db.rewardLedger.create({
          data: {
            userId: input.userId,
            basis: input.basis,
            kind: input.kind,
            drops: input.drops,
            dateKey: input.dateKey,
          },
        })
        return true
      } catch (error) {
        if (isUniqueViolation(error)) return false
        throw error
      }
    },

    async achievements(userId) {
      const rows = await db.achievement.findMany({
        where: { userId },
        orderBy: { unlockedAt: 'asc' },
      })
      return rows.map((row) => ({ key: row.key, unlockedAt: row.unlockedAt.toISOString() }))
    },

    async unlockAchievement(userId, key) {
      try {
        await db.achievement.create({ data: { userId, key } })
        return true
      } catch (error) {
        if (isUniqueViolation(error)) return false
        throw error
      }
    },
  }
}

function toPlantDto(plant: {
  id: string
  species: string
  stage: number
  name: string | null
  slot: number
  plantedAt: Date
}): GardenPlantDto {
  return {
    id: plant.id,
    species: plant.species as GardenSpecies,
    stage: plant.stage,
    name: plant.name,
    slot: plant.slot,
    plantedAt: plant.plantedAt.toISOString(),
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  )
}
