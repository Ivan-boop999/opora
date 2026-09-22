import {
  enrollmentDayRequestSchema,
  focusFinishSchema,
  focusMarkSchema,
  focusStartSchema,
  routineInputSchema,
  routineOccurrenceUpdateSchema,
  sleepInputSchema,
  type EnrollmentDto,
  type FocusDto,
  type ProgramDto,
  type RoutineDto,
  type SleepDto,
} from '@opora/contracts'
import type { z } from 'zod'

export type PlansRepository = {
  // Routines
  listRoutines(userId: string, dateKey: string): Promise<RoutineDto[]>
  createRoutine(userId: string, input: RoutineCreateInput, startDateKey: string): Promise<RoutineDto>
  findRoutine(userId: string, routineId: string): Promise<RoutineDto | null>
  updateRoutine(
    userId: string,
    routineId: string,
    patch: Partial<RoutineCreateInput> & { pausedAt?: Date | null; archivedAt?: Date | null },
  ): Promise<RoutineDto | null>
  deleteRoutine(userId: string, routineId: string): Promise<boolean>
  setOccurrence(
    userId: string,
    routineId: string,
    dateKey: string,
    status: 'done' | 'partial' | 'moved' | 'skipped',
  ): Promise<void>

  // Programs
  listPrograms(): Promise<ProgramDto[]>
  programByCode(code: string): Promise<ProgramDto | null>
  activeEnrollment(userId: string): Promise<EnrollmentDto | null>
  enroll(userId: string, code: string): Promise<EnrollmentDto | null>
  pauseEnrollment(userId: string): Promise<void>
  resumeEnrollment(userId: string): Promise<void>
  dropEnrollment(userId: string): Promise<void>
  logProgramDay(
    userId: string,
    status: 'done' | 'partial' | 'skipped',
    dateKey: string,
  ): Promise<{ enrollment: EnrollmentDto; finished: boolean } | null>

  // Focus
  startFocus(userId: string, input: FocusStartInput, dateKey: string): Promise<FocusDto>
  findFocus(userId: string, focusId: string): Promise<FocusDto | null>
  appendFocusMark(userId: string, focusId: string, mark: FocusMarkInput): Promise<void>
  finishFocus(userId: string, focusId: string, status: 'completed' | 'stopped'): Promise<FocusDto | null>
  listFocus(userId: string, range: { from?: string; to?: string }): Promise<FocusDto[]>

  // Sleep
  upsertSleep(userId: string, dateKey: string, input: SleepInput): Promise<SleepDto>
  listSleep(userId: string, range: { from?: string; to?: string }): Promise<SleepDto[]>
}

export type RoutineCreateInput = Omit<z.infer<typeof routineInputSchema>, 'timeOfDay'> & {
  timeOfDay: 'morning' | 'day' | 'evening'
}
export type FocusStartInput = z.infer<typeof focusStartSchema>
export type FocusMarkInput = z.infer<typeof focusMarkSchema>
export type SleepInput = z.infer<typeof sleepInputSchema>

export class RoutinesService {
  constructor(
    private readonly repository: PlansRepository,
    private readonly deps: { dateKeyNow: (userId: string) => Promise<string> },
  ) {}

  list(userId: string) {
    return this.repository.listRoutines(userId, '')
  }

  async create(userId: string, input: RoutineCreateInput) {
    return this.repository.createRoutine(userId, input, await this.deps.dateKeyNow(userId))
  }

  async update(userId: string, routineId: string, patch: Partial<RoutineCreateInput>) {
    const updated = await this.repository.updateRoutine(userId, routineId, patch)
    if (!updated) throw new PlansFailure('routine_not_found', 'Опора не найдена')
    return updated
  }

  async setPaused(userId: string, routineId: string, paused: boolean) {
    const updated = await this.repository.updateRoutine(userId, routineId, {
      pausedAt: paused ? new Date() : null,
    })
    if (!updated) throw new PlansFailure('routine_not_found', 'Опора не найдена')
    return updated
  }

  async archive(userId: string, routineId: string) {
    const updated = await this.repository.updateRoutine(userId, routineId, { archivedAt: new Date() })
    if (!updated) throw new PlansFailure('routine_not_found', 'Опора не найдена')
    return updated
  }

  async delete(userId: string, routineId: string) {
    if (!(await this.repository.deleteRoutine(userId, routineId))) {
      throw new PlansFailure('routine_not_found', 'Опора не найдена')
    }
  }

  async setOccurrence(
    userId: string,
    routineId: string,
    dateKey: string,
    status: z.infer<typeof routineOccurrenceUpdateSchema>['status'],
  ) {
    if (!(await this.repository.findRoutine(userId, routineId))) {
      throw new PlansFailure('routine_not_found', 'Опора не найдена')
    }
    await this.repository.setOccurrence(userId, routineId, dateKey, status)
  }
}

export class ProgramsService {
  constructor(
    private readonly repository: PlansRepository,
    private readonly deps: { dateKeyNow: (userId: string) => Promise<string> },
  ) {}

  list() {
    return this.repository.listPrograms()
  }

  async byCode(code: string) {
    return this.repository.programByCode(code)
  }

  async activeEnrollment(userId: string) {
    return this.repository.activeEnrollment(userId)
  }

  async enroll(userId: string, code: string) {
    if (!(await this.repository.programByCode(code))) {
      throw new PlansFailure('program_not_found', 'Программа не найдена')
    }
    if (await this.repository.activeEnrollment(userId)) {
      throw new PlansFailure(
        'already_enrolled',
        'Сначала заверши или приостанови текущую программу — потом можно начать новую',
      )
    }
    const enrollment = await this.repository.enroll(userId, code)
    if (!enrollment) throw new PlansFailure('program_not_found', 'Программа не найдена')
    return enrollment
  }

  async pause(userId: string) {
    await this.repository.pauseEnrollment(userId)
  }

  async resume(userId: string) {
    await this.repository.resumeEnrollment(userId)
  }

  async drop(userId: string) {
    await this.repository.dropEnrollment(userId)
  }

  async logDay(userId: string, status: z.infer<typeof enrollmentDayRequestSchema>['status']) {
    const result = await this.repository.logProgramDay(userId, status, await this.deps.dateKeyNow(userId))
    if (!result) {
      throw new PlansFailure('no_active_program', 'Нет активной программы')
    }
    return result
  }
}

export class FocusService {
  constructor(
    private readonly repository: PlansRepository,
    private readonly deps: { dateKeyNow: (userId: string) => Promise<string> },
  ) {}

  async start(userId: string, input: FocusStartInput) {
    return this.repository.startFocus(userId, input, await this.deps.dateKeyNow(userId))
  }

  async mark(userId: string, focusId: string, mark: FocusMarkInput) {
    if (!(await this.repository.findFocus(userId, focusId))) {
      throw new PlansFailure('focus_not_found', 'Сессия не найдена')
    }
    await this.repository.appendFocusMark(userId, focusId, mark)
  }

  async finish(userId: string, focusId: string, status: z.infer<typeof focusFinishSchema>['status']) {
    const finished = await this.repository.finishFocus(userId, focusId, status)
    if (!finished) throw new PlansFailure('focus_not_found', 'Сессия не найдена или уже завершена')
    return finished
  }

  list(userId: string, range: { from?: string; to?: string }) {
    return this.repository.listFocus(userId, range)
  }
}

export class SleepService {
  constructor(
    private readonly repository: PlansRepository,
    private readonly deps: { dateKeyNow: (userId: string) => Promise<string> },
  ) {}

  async upsert(userId: string, input: SleepInput) {
    return this.repository.upsertSleep(userId, await this.deps.dateKeyNow(userId), input)
  }

  upsertForDate(userId: string, dateKey: string, input: SleepInput) {
    return this.repository.upsertSleep(userId, dateKey, input)
  }

  list(userId: string, range: { from?: string; to?: string }) {
    return this.repository.listSleep(userId, range)
  }
}

export class PlansFailure extends Error {
  constructor(
    public readonly kind: string,
    message: string,
  ) {
    super(message)
  }
}
