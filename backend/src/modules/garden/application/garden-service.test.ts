import { describe, expect, test } from 'bun:test'
import type { GardenPlantDto } from '@opora/contracts'

import {
  DAILY_DROP_CAP,
  GardenService,
  SPECIES_UNLOCK_AT,
  STAGE_THRESHOLDS,
  targetStage,
  type GardenRepository,
} from './garden-service'

type State = {
  today: number
  total: number
  bases: Set<string>
  plants: GardenPlantDto[]
  achievements: Set<string>
  slotsTaken: number
}

function fakeRepository(state: State): GardenRepository {
  return {
    getPreferencesVisibility: async () => true,
    getScene: async () => 'day',
    setScene: async () => {},
    listPlants: async () => state.plants,
    findFreeSlot: async () => (state.slotsTaken < 8 ? state.slotsTaken : null),
    plantExists: async (_userId, plantId) => state.plants.some((plant) => plant.id === plantId),
    createPlant: async ({ species, slot }) => {
      const plant: GardenPlantDto = {
        id: `plant-${state.plants.length + 1}`,
        species,
        stage: 1,
        name: null,
        slot,
        plantedAt: new Date().toISOString(),
      }
      state.plants.push(plant)
      state.slotsTaken += 1
      return plant
    },
    updatePlant: async () => {},
    findGrowingPlant: async () =>
      [...state.plants].reverse().find((plant) => plant.stage < 5) ?? null,
    growPlant: async (_userId, plantId, stage) => {
      const plant = state.plants.find((candidate) => candidate.id === plantId)
      if (plant) plant.stage = stage
    },
    totalDrops: async () => state.total,
    todayDrops: async () => state.today,
    ledgerInsert: async (input) => {
      if (state.bases.has(input.basis)) return false
      state.bases.add(input.basis)
      state.today += input.drops
      state.total += input.drops
      return true
    },
    achievements: async () => [...state.achievements].map((key) => ({ key, unlockedAt: '2026-09-22T00:00:00Z' })),
    unlockAchievement: async (_userId, key) => {
      if (state.achievements.has(key)) return false
      state.achievements.add(key)
      return true
    },
  }
}

const freshState = (): State => ({
  today: 0,
  total: 0,
  bases: new Set(),
  plants: [],
  achievements: new Set(),
  slotsTaken: 0,
})

describe('garden reward invariants', () => {
  test('a repeated basis grants nothing the second time', async () => {
    const state = freshState()
    const service = new GardenService(fakeRepository(state))
    const first = await service.applyReward({
      userId: 'u1',
      basis: 'practice-session:s1',
      kind: 'first-action',
      drops: 2,
      dateKey: '2026-09-22',
    })
    const second = await service.applyReward({
      userId: 'u1',
      basis: 'practice-session:s1',
      kind: 'first-action',
      drops: 2,
      dateKey: '2026-09-22',
    })
    expect(first?.dropsGranted).toBe(2)
    expect(second).toBeNull()
    expect(state.total).toBe(2)
  })

  test('the daily cap keeps the day at 4 drops', async () => {
    const state = freshState()
    state.today = 3
    state.total = 3
    const service = new GardenService(fakeRepository(state))
    const result = await service.applyReward({
      userId: 'u1',
      basis: 'journal-day:u1:2026-09-22',
      kind: 'journal',
      drops: 1,
      dateKey: '2026-09-22',
    })
    expect(result?.todayDrops).toBe(DAILY_DROP_CAP)
  })

  test('growth follows cumulative thresholds, never today alone', async () => {
    const state = freshState()
    state.total = STAGE_THRESHOLDS[0]
    const service = new GardenService(fakeRepository(state))
    await service.plant({ userId: 'u1', species: 'sprout' })
    const result = await service.applyReward({
      userId: 'u1',
      basis: 'checkin-day:u1:2026-09-22',
      kind: 'checkin',
      drops: 1,
      dateKey: '2026-09-22',
    })
    // total is past the first threshold, so the plant grows to stage 2.
    expect(result?.plantGrewTo?.stage).toBe(2)
    expect(targetStage(state.total)).toBe(2)
  })

  test('locked species cannot be planted', async () => {
    const state = freshState()
    state.total = SPECIES_UNLOCK_AT.fern - 1
    const service = new GardenService(fakeRepository(state))
    expect(service.plant({ userId: 'u1', species: 'fern' })).rejects.toThrow()
    expect(service.plant({ userId: 'u1', species: 'sprout' })).resolves.toBeTruthy()
  })

  test('achievements unlock exactly once', async () => {
    const state = freshState()
    const service = new GardenService(fakeRepository(state))
    expect(await service.achieve('u1', 'first-step')).toBe(true)
    expect(await service.achieve('u1', 'first-step')).toBe(false)
  })

  test('targetStage is monotonic and capped at 5', () => {
    expect(targetStage(0)).toBe(1)
    expect(targetStage(STAGE_THRESHOLDS[3])).toBe(5)
    expect(targetStage(1000)).toBe(5)
    expect(targetStage(STAGE_THRESHOLDS[2] - 1)).toBe(3)
  })
})
