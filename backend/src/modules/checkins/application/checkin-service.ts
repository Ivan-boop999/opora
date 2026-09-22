import {
  checkInDtoSchema,
  checkInInputSchema,
  type CheckInDto,
} from '@opora/contracts'
import type { z } from 'zod'

export type CheckInRepository = {
  create(input: {
    userId: string
    data: z.infer<typeof checkInInputSchema>
    dateKey: string
  }): Promise<CheckInDto>
  list(userId: string, range: { from?: string; to?: string }): Promise<CheckInDto[]>
  findOwned(userId: string, id: string): Promise<CheckInDto | null>
  update(
    userId: string,
    id: string,
    data: Partial<z.infer<typeof checkInInputSchema>>,
  ): Promise<CheckInDto | null>
  delete(userId: string, id: string): Promise<boolean>
}

/** One check-in or journal note per day feeds the garden; the reward layer dedupes. */
export class CheckInService {
  constructor(
    private readonly repository: CheckInRepository,
    private readonly deps: {
      dateKeyNow: (userId: string) => Promise<string>
      onCreated: (input: { userId: string; dateKey: string }) => Promise<unknown>
    },
  ) {}

  async create(userId: string, data: z.infer<typeof checkInInputSchema>) {
    const dateKey = await this.deps.dateKeyNow(userId)
    const created = await this.repository.create({ userId, data, dateKey })
    await this.deps.onCreated({ userId, dateKey })
    return created
  }

  list(userId: string, range: { from?: string; to?: string }) {
    return this.repository.list(userId, range)
  }

  async update(userId: string, id: string, data: Partial<z.infer<typeof checkInInputSchema>>) {
    return this.repository.update(userId, id, data)
  }

  async delete(userId: string, id: string) {
    return this.repository.delete(userId, id)
  }

  validateDto(dto: CheckInDto) {
    return checkInDtoSchema.parse(dto)
  }
}
