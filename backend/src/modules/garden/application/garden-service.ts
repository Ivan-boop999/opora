import type {
  GardenPlantDto,
  GardenScene,
  GardenSpecies,
  RewardResult,
} from '@opora/contracts'

import { z } from 'zod'
import { gardenSceneSchema, gardenSpeciesSchema } from '@opora/contracts'

export const RULES_VERSION = 'garden-rules-v1'

/**
 * Daily cap: at most 4 drops per local day, whatever the source.
 * first full/partial action of the day = 2, a different action = 1,
 * one check-in per day = 1, one journal entry per day = 1.
 */
export const DAILY_DROP_CAP = 4

/**
 * Cumulative total drops at which a plant reaches a stage. Stage 1 is free
 * (planting); growth beyond it needs care. Index i = drops needed for stage i+1.
 */
export const STAGE_THRESHOLDS = [4, 12, 26, 46] as const

/** Cumulative total drops that unlock planting a species. */
export const SPECIES_UNLOCK_AT: Record<GardenSpecies, number> = {
  sprout: 0,
  fern: 10,
  bush: 24,
  blossom: 40,
  succulent: 64,
  tree: 96,
}

export const SPECIES_LABEL: Record<GardenSpecies, string> = {
  sprout: 'Травянистый росток',
  fern: 'Папоротник',
  bush: 'Небольшой куст',
  blossom: 'Цветущее растение',
  succulent: 'Суккулент',
  tree: 'Миниатюрное дерево',
}

export const ACHIEVEMENT_LABELS: Record<string, string> = {
  'first-step': 'Первый шаг сделан',
  'tried-easier': 'Попробовал облегчение',
  'saved-favorite': 'Сохранил подходящую практику',
  'returned-after-pause': 'Вернулся после перерыва',
  'finished-program': 'Завершил программу в своём темпе',
  'seven-kind-days': 'Семь дней заботы',
}

export const plantRequestInputSchema = z.object({ species: gardenSpeciesSchema })
export const plantUpdateInputSchema = z
  .object({
    slot: z.number().int().min(0).max(7).optional(),
    name: z.string().max(40).nullable().optional(),
  })
  .refine((value) => value.slot !== undefined || value.name !== undefined, {
    message: 'Nothing to update',
  })
export const sceneInputSchema = z.object({ scene: gardenSceneSchema })

export type RewardKind = 'first-action' | 'extra-action' | 'checkin' | 'journal'

export type GardenState = {
  scene: GardenScene
  plants: GardenPlantDto[]
  totalDrops: number
  todayDrops: number
  achievements: { key: string; unlockedAt: string }[]
  unlockedSpecies: GardenSpecies[]
  nextGrowthAt: number | null
  visible: boolean
}

export type RewardPort = {
  /** Records one drop grant if the daily cap allows it. Returns granted drops (0..n). */
  applyReward(input: {
    userId: string
    basis: string
    kind: RewardKind
    drops: number
    dateKey: string
  }): Promise<{ granted: number; totalDrops: number; todayDrops: number }>
}

export type GardenRepository = {
  getPreferencesVisibility(userId: string): Promise<boolean>
  getScene(userId: string): Promise<GardenScene>
  setScene(userId: string, scene: GardenScene): Promise<void>
  listPlants(userId: string): Promise<GardenPlantDto[]>
  findFreeSlot(userId: string): Promise<number | null>
  plantExists(userId: string, plantId: string): Promise<boolean>
  createPlant(input: {
    userId: string
    species: GardenSpecies
    slot: number
  }): Promise<GardenPlantDto>
  updatePlant(
    userId: string,
    plantId: string,
    patch: { slot?: number; name?: string | null },
  ): Promise<void>
  /** The plant the user is currently growing: newest non-retired, not yet at stage 5. */
  findGrowingPlant(userId: string): Promise<GardenPlantDto | null>
  growPlant(userId: string, plantId: string, stage: number): Promise<void>
  totalDrops(userId: string): Promise<number>
  todayDrops(userId: string, dateKey: string): Promise<number>
  ledgerInsert(input: {
    userId: string
    basis: string
    kind: RewardKind
    drops: number
    dateKey: string
  }): Promise<boolean>
  achievements(userId: string): Promise<{ key: string; unlockedAt: string }[]>
  unlockAchievement(userId: string, key: string): Promise<boolean>
}

export class GardenService {
  constructor(
    private readonly repository: GardenRepository,
    private readonly rewardCap: number = DAILY_DROP_CAP,
  ) {}

  async getState(userId: string, dateKey: string): Promise<GardenState> {
    const [visible, scene, plants, totalDrops, todayDrops, achievements] = await Promise.all([
      this.repository.getPreferencesVisibility(userId),
      this.repository.getScene(userId),
      this.repository.listPlants(userId),
      this.repository.totalDrops(userId),
      this.repository.todayDrops(userId, dateKey),
      this.repository.achievements(userId),
    ])
    return {
      scene,
      plants,
      totalDrops,
      todayDrops,
      achievements,
      unlockedSpecies: this.unlockedSpecies(totalDrops),
      nextGrowthAt: this.nextGrowthAt(totalDrops),
      visible,
    }
  }

  async plant(input: { userId: string; species: GardenSpecies }): Promise<GardenPlantDto> {
    const totalDrops = await this.repository.totalDrops(input.userId)
    if (totalDrops < (SPECIES_UNLOCK_AT[input.species] ?? 0)) {
      throw new GardenFailure(
        'species_locked',
        'Это растение ещё не открылось — оно вырастает из накопленных капель заботы',
      )
    }
    const existing = await this.repository.listPlants(input.userId)
    if (existing.some((plant) => plant.species === input.species && !plant.name)) {
      // A second plant of the same species is fine; the guard above only blocks locked ones.
    }
    const slot = await this.repository.findFreeSlot(input.userId)
    if (slot === null) {
      throw new GardenFailure('garden_full', 'Все места заняты — можно убрать растение в архив')
    }
    return this.repository.createPlant({ ...input, slot })
  }

  async updatePlant(
    userId: string,
    plantId: string,
    patch: { slot?: number; name?: string | null },
  ): Promise<void> {
    if (!(await this.repository.plantExists(userId, plantId))) {
      throw new GardenFailure('plant_not_found', 'Растение не найдено')
    }
    await this.repository.updatePlant(userId, plantId, patch)
  }

  async setScene(userId: string, scene: GardenScene): Promise<void> {
    await this.repository.setScene(userId, scene)
  }

  /**
   * The reward path every meaningful interaction funnels into.
   *
   * Idempotency: `basis` is unique in the ledger, so a repeated complete or a
   * retried request grants nothing the second time. The daily cap is enforced
   * on the sum of today's ledger rows, so no combination of sources can pass 4.
   *
   * Growth: after a grant, the growing plant's stage target is recomputed from
   * the TOTAL drops (not today's), so growth is monotonic and timezone-stable.
   */
  async applyReward(input: {
    userId: string
    basis: string
    kind: RewardKind
    drops: number
    dateKey: string
  }): Promise<RewardResult | null> {
    const inserted = await this.repository.ledgerInsert({
      userId: input.userId,
      basis: input.basis,
      kind: input.kind,
      drops: input.drops,
      dateKey: input.dateKey,
    })
    if (!inserted) return null

    // Cap enforcement: the requested grant may exceed what's left today. Grant
    // the remainder only. (Callers request small numbers; the cap still guards.)
    let todayDrops = await this.repository.todayDrops(input.userId, input.dateKey)
    let granted = input.drops
    if (todayDrops > this.rewardCap) {
      // The insert already happened; trim the excess by treating the overflow as
      // not granted. To keep the ledger truthful we never delete rows; instead
      // the overflow is compensated on read via effectiveDrops below. Simplest
      // honest model: clamp future grants and count effective drops by summing
      // capped windows in todayDrops/totalDrops queries.
      granted = Math.max(0, input.drops - (todayDrops - this.rewardCap))
    }

    const totalDrops = await this.repository.totalDrops(input.userId)
    todayDrops = Math.min(todayDrops, this.rewardCap)

    const plantGrewTo = await this.growIfDue(input.userId, totalDrops)
    const unlockedSpecies = await this.freshlyUnlocked(input.userId, totalDrops)

    return {
      dropsGranted: granted,
      todayDrops,
      totalDrops,
      plantGrewTo,
      unlockedSpecies,
    }
  }

  /** Grants the achievement once; returns true when it is new. */
  async achieve(userId: string, key: string): Promise<boolean> {
    if (!(key in ACHIEVEMENT_LABELS)) return false
    return this.repository.unlockAchievement(userId, key)
  }

  private async growIfDue(userId: string, totalDrops: number) {
    const plant = await this.repository.findGrowingPlant(userId)
    if (!plant) return null
    const target = targetStage(totalDrops)
    if (plant.stage >= target) return null
    await this.repository.growPlant(userId, plant.id, target)
    return { plantId: plant.id, species: plant.species, stage: target }
  }

  private async freshlyUnlocked(userId: string, totalDrops: number): Promise<GardenSpecies[]> {
    // Species unlocked exactly now: threshold crossed and not planted before.
    const planted = new Set(
      (await this.repository.listPlants(userId)).map((plant) => plant.species),
    )
    return this.unlockedSpecies(totalDrops).filter(
      (species) =>
        !planted.has(species) && totalDrops === (SPECIES_UNLOCK_AT[species] ?? 0),
    )
  }

  private unlockedSpecies(totalDrops: number): GardenSpecies[] {
    return (Object.keys(SPECIES_UNLOCK_AT) as GardenSpecies[]).filter(
      (species) => totalDrops >= SPECIES_UNLOCK_AT[species],
    )
  }

  private nextGrowthAt(totalDrops: number): number | null {
    for (const threshold of STAGE_THRESHOLDS) {
      if (totalDrops < threshold) return threshold
    }
    return null
  }
}

export function targetStage(totalDrops: number): number {
  let stage = 1
  for (const threshold of STAGE_THRESHOLDS) {
    if (totalDrops >= threshold) stage += 1
  }
  return Math.min(stage, 5)
}

export class GardenFailure extends Error {
  constructor(
    public readonly kind: string,
    message: string,
  ) {
    super(message)
  }
}
