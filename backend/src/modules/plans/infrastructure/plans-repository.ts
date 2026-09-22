import type {
  EnrollmentDto,
  FocusDto,
  ProgramDto,
  RoutineDto,
  SleepDto,
} from '@opora/contracts'

import type { DbClient } from '../../../db'
import type {
  FocusMarkInput,
  FocusStartInput,
  PlansRepository,
  RoutineCreateInput,
  SleepInput,
} from '../application/plans-service'

export function createPrismaPlansRepository(db: DbClient): PlansRepository {
  return {
    // ---------------------------------------------------------------- routines
    async listRoutines(userId, dateKey) {
      const routines = await db.routine.findMany({
        where: { userId, archivedAt: null },
        orderBy: [{ timeOfDay: 'asc' }, { createdAt: 'asc' }],
      })
      const occurrences = await db.routineOccurrence.findMany({
        where: { userId, dateKey },
      })
      const byRoutine = new Map(occurrences.map((row) => [row.routineId, row.status]))
      return routines.map((routine) => toRoutineDto(routine, byRoutine.get(routine.id) ?? null))
    },

    async createRoutine(userId, input, startDateKey) {
      const routine = await db.routine.create({
        data: {
          userId,
          title: input.title,
          practiceCode: input.practiceCode ?? null,
          ...(input.customSteps ? { customSteps: input.customSteps } : {}),
          easierVariant: input.easierVariant ?? null,
          timeOfDay: input.timeOfDay,
          timeMinutes: input.timeMinutes ?? null,
          weekdays: input.weekdays,
          optional: input.optional,
          category: input.category ?? null,
          startDateKey,
        },
      })
      return toRoutineDto(routine, null)
    },

    async findRoutine(userId, routineId) {
      const routine = await db.routine.findFirst({
        where: { id: routineId, userId, archivedAt: null },
      })
      return routine ? toRoutineDto(routine, null) : null
    },

    async updateRoutine(userId, routineId, patch) {
      const updated = await db.routine.updateMany({
        where: { id: routineId, userId },
        data: {
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.practiceCode !== undefined ? { practiceCode: patch.practiceCode } : {}),
          ...(patch.customSteps ? { customSteps: patch.customSteps } : {}),
          ...(patch.easierVariant !== undefined ? { easierVariant: patch.easierVariant } : {}),
          ...(patch.timeOfDay !== undefined ? { timeOfDay: patch.timeOfDay } : {}),
          ...(patch.timeMinutes !== undefined ? { timeMinutes: patch.timeMinutes } : {}),
          ...(patch.weekdays !== undefined ? { weekdays: patch.weekdays } : {}),
          ...(patch.optional !== undefined ? { optional: patch.optional } : {}),
          ...(patch.category !== undefined ? { category: patch.category } : {}),
          ...(patch.pausedAt !== undefined ? { pausedAt: patch.pausedAt } : {}),
          ...(patch.archivedAt !== undefined ? { archivedAt: patch.archivedAt } : {}),
        },
      })
      if (updated.count === 0) return null
      const routine = await db.routine.findFirst({ where: { id: routineId, userId } })
      return routine ? toRoutineDto(routine, null) : null
    },

    async deleteRoutine(userId, routineId) {
      const deleted = await db.routine.deleteMany({ where: { id: routineId, userId } })
      return deleted.count > 0
    },

    async setOccurrence(userId, routineId, dateKey, status) {
      await db.routineOccurrence.upsert({
        where: { routineId_dateKey: { routineId, dateKey } },
        create: { routineId, userId, dateKey, status },
        update: { status, completedAt: status === 'done' || status === 'partial' ? new Date() : null },
      })
    },

    // ---------------------------------------------------------------- programs
    async listPrograms() {
      const versions = await db.programVersion.findMany({
        where: { status: 'published' },
        include: { program: true, days: { orderBy: { dayNumber: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      })
      return versions.map((version) => toProgramDto(version))
    },

    async programByCode(code) {
      const program = await db.program.findUnique({ where: { code } })
      if (!program) return null
      const version = await db.programVersion.findFirst({
        where: { programId: program.id, status: 'published' },
        include: { program: true, days: { orderBy: { dayNumber: 'asc' } } },
        orderBy: { version: 'desc' },
      })
      return version ? toProgramDto(version) : null
    },

    async activeEnrollment(userId) {
      const enrollment = await db.programEnrollment.findFirst({
        where: { userId, status: { in: ['active', 'paused'] } },
        include: {
          programVersion: {
            include: { program: true, days: { orderBy: { dayNumber: 'asc' } } },
          },
          dayLogs: { orderBy: { dayNumber: 'asc' } },
        },
        orderBy: { startedAt: 'desc' },
      })
      return enrollment ? toEnrollmentDto(enrollment) : null
    },

    async enroll(userId, code) {
      const program = await db.program.findUnique({ where: { code } })
      if (!program) return null
      const version = await db.programVersion.findFirst({
        where: { programId: program.id, status: 'published' },
        orderBy: { version: 'desc' },
        include: { program: true, days: { orderBy: { dayNumber: 'asc' } } },
      })
      if (!version) return null
      const enrollment = await db.programEnrollment.create({
        data: { userId, programVersionId: version.id },
        include: {
          programVersion: {
            include: { program: true, days: { orderBy: { dayNumber: 'asc' } } },
          },
          dayLogs: true,
        },
      })
      return toEnrollmentDto(enrollment)
    },

    async pauseEnrollment(userId) {
      await db.programEnrollment.updateMany({
        where: { userId, status: 'active' },
        data: { status: 'paused' },
      })
    },

    async resumeEnrollment(userId) {
      await db.programEnrollment.updateMany({
        where: { userId, status: 'paused' },
        data: { status: 'active' },
      })
    },

    async dropEnrollment(userId) {
      await db.programEnrollment.updateMany({
        where: { userId, status: { in: ['active', 'paused'] } },
        data: { status: 'dropped' },
      })
    },

    async logProgramDay(userId, status, dateKey) {
      const enrollment = await db.programEnrollment.findFirst({
        where: { userId, status: 'active' },
        include: {
          programVersion: {
            include: { program: true, days: { orderBy: { dayNumber: 'asc' } } },
          },
          dayLogs: true,
        },
      })
      if (!enrollment) return null

      await db.programDayLog.upsert({
        where: {
          enrollmentId_dayNumber: { enrollmentId: enrollment.id, dayNumber: enrollment.currentDay },
        },
        create: {
          enrollmentId: enrollment.id,
          dayNumber: enrollment.currentDay,
          dateKey,
          status,
        },
        update: { status },
      })

      const daysCount = enrollment.programVersion.daysCount
      const finished = enrollment.currentDay >= daysCount
      const updated = await db.programEnrollment.update({
        where: { id: enrollment.id },
        data: {
          lastActivityAt: new Date(),
          ...(finished
            ? { status: 'completed', completedAt: new Date() }
            : { currentDay: enrollment.currentDay + 1 }),
        },
        include: {
          programVersion: {
            include: { program: true, days: { orderBy: { dayNumber: 'asc' } } },
          },
          dayLogs: { orderBy: { dayNumber: 'asc' } },
        },
      })
      return { enrollment: toEnrollmentDto(updated), finished }
    },

    // ---------------------------------------------------------------- focus
    async startFocus(userId, input, dateKey) {
      const focus = await db.focusSession.create({
        data: {
          userId,
          intention: input.intention,
          plannedMinutes: input.plannedMinutes,
          dateKey,
          marks: [{ at: new Date().toISOString(), type: 'start' }],
        },
      })
      return toFocusDto(focus)
    },

    async findFocus(userId, focusId) {
      const focus = await db.focusSession.findFirst({ where: { id: focusId, userId } })
      return focus ? toFocusDto(focus) : null
    },

    async appendFocusMark(userId, focusId, mark) {
      const focus = await db.focusSession.findFirst({
        where: { id: focusId, userId, endedAt: null },
      })
      if (!focus) return
      const marks = [...(focus.marks as FocusMark[]), { at: mark.at, type: mark.type }]
      const elapsed = elapsedFromMarks(marks, new Date())
      await db.focusSession.update({
        where: { id: focusId },
        data: {
          marks,
          elapsedSeconds: elapsed,
          status: mark.type === 'pause' ? 'paused' : 'active',
        },
      })
    },

    async finishFocus(userId, focusId, status) {
      const focus = await db.focusSession.findFirst({
        where: { id: focusId, userId, endedAt: null },
      })
      if (!focus) return null
      const endedAt = new Date()
      const marks = focus.marks as FocusMark[]
      const elapsed =
        marks[marks.length - 1]?.type === 'pause'
          ? focus.elapsedSeconds
          : elapsedFromMarks(marks, endedAt)
      const updated = await db.focusSession.update({
        where: { id: focusId },
        data: { status, endedAt, elapsedSeconds: elapsed },
      })
      return toFocusDto(updated)
    },

    async listFocus(userId, range) {
      const rows = await db.focusSession.findMany({
        where: {
          userId,
          ...(range.from ? { dateKey: { gte: range.from } } : {}),
          ...(range.to ? { dateKey: { lte: range.to } } : {}),
        },
        orderBy: { startedAt: 'desc' },
        take: 100,
      })
      return rows.map(toFocusDto)
    },

    // ---------------------------------------------------------------- sleep
    async upsertSleep(userId, dateKey, input) {
      const row = await db.sleepEntry.upsert({
        where: { userId_dateKey: { userId, dateKey } },
        create: {
          userId,
          dateKey,
          quality: input.quality,
          bedAt: input.bedAt ?? null,
          wakeAt: input.wakeAt ?? null,
        },
        update: {
          quality: input.quality,
          bedAt: input.bedAt ?? null,
          wakeAt: input.wakeAt ?? null,
        },
      })
      return toSleepDto(row)
    },

    async listSleep(userId, range) {
      const rows = await db.sleepEntry.findMany({
        where: {
          userId,
          ...(range.from ? { dateKey: { gte: range.from } } : {}),
          ...(range.to ? { dateKey: { lte: range.to } } : {}),
        },
        orderBy: { dateKey: 'desc' },
        take: 120,
      })
      return rows.map(toSleepDto)
    },
  }
}

type FocusMark = { at: string; type: string }

/** Wall-clock arithmetic: the only source of truth for elapsed time. */
function elapsedFromMarks(marks: FocusMark[], now: Date): number {
  let elapsed = 0
  let openAt: number | null = null
  for (const mark of marks) {
    const at = new Date(mark.at).getTime()
    if (mark.type === 'start' || mark.type === 'resume') {
      openAt = at
    } else if (mark.type === 'pause' && openAt !== null) {
      elapsed += Math.max(0, Math.round((at - openAt) / 1000))
      openAt = null
    }
  }
  if (openAt !== null) {
    elapsed += Math.max(0, Math.round((now.getTime() - openAt) / 1000))
  }
  return elapsed
}

function toRoutineDto(
  routine: {
    id: string
    title: string
    practiceCode: string | null
    customSteps: unknown
    easierVariant: string | null
    timeOfDay: string
    timeMinutes: number | null
    weekdays: number[]
    optional: boolean
    category: string | null
    startDateKey: string
    pausedAt: Date | null
    archivedAt: Date | null
  },
  todayStatus: string | null,
): RoutineDto {
  return {
    id: routine.id,
    title: routine.title,
    practiceCode: routine.practiceCode,
    customSteps: (routine.customSteps as RoutineDto['customSteps']) ?? null,
    easierVariant: routine.easierVariant,
    timeOfDay: routine.timeOfDay as RoutineDto['timeOfDay'],
    timeMinutes: routine.timeMinutes,
    weekdays: routine.weekdays,
    optional: routine.optional,
    category: routine.category,
    startDateKey: routine.startDateKey,
    pausedAt: routine.pausedAt?.toISOString() ?? null,
    archivedAt: routine.archivedAt?.toISOString() ?? null,
    todayStatus: (todayStatus as RoutineDto['todayStatus']) ?? null,
  }
}

function toProgramDto(version: {
  version: number
  title: string
  goal: string
  audience: string
  daysCount: number
  program: { code: string }
  days: {
    dayNumber: number
    intro: string
    practiceCode: string | null
    alternativePracticeCode: string | null
    customStep: unknown
    question: string | null
  }[]
}): ProgramDto {
  return {
    code: version.program.code,
    version: version.version,
    title: version.title,
    goal: version.goal,
    audience: version.audience,
    daysCount: version.daysCount,
    days: version.days.map((day) => ({
      dayNumber: day.dayNumber,
      intro: day.intro,
      practiceCode: day.practiceCode,
      alternativePracticeCode: day.alternativePracticeCode,
      customStep: (day.customStep as ProgramDto['days'][number]['customStep']) ?? null,
      question: day.question,
    })),
  }
}

function toEnrollmentDto(enrollment: {
  id: string
  status: string
  currentDay: number
  startedAt: Date
  programVersion: {
    daysCount: number
    program: { code: string }
    title: string
    days: {
      dayNumber: number
      intro: string
      practiceCode: string | null
      alternativePracticeCode: string | null
      customStep: unknown
      question: string | null
    }[]
  }
  dayLogs: { dayNumber: number }[]
}): EnrollmentDto {
  const current = enrollment.programVersion.days.find(
    (day) => day.dayNumber === enrollment.currentDay,
  )
  return {
    id: enrollment.id,
    programCode: enrollment.programVersion.program.code,
    programTitle: enrollment.programVersion.title,
    status: enrollment.status as EnrollmentDto['status'],
    currentDay: enrollment.currentDay,
    daysCount: enrollment.programVersion.daysCount,
    startedAt: enrollment.startedAt.toISOString(),
    day: current
      ? {
          dayNumber: current.dayNumber,
          intro: current.intro,
          practiceCode: current.practiceCode,
          alternativePracticeCode: current.alternativePracticeCode,
          customStep: (current.customStep as ProgramDto['days'][number]['customStep']) ?? null,
          question: current.question,
        }
      : null,
    completedDays: enrollment.dayLogs.map((log) => log.dayNumber),
  }
}

function toFocusDto(focus: {
  id: string
  intention: string
  plannedMinutes: number
  status: string
  startedAt: Date
  endedAt: Date | null
  elapsedSeconds: number
  dateKey: string
}): FocusDto {
  return {
    id: focus.id,
    intention: focus.intention,
    plannedMinutes: focus.plannedMinutes,
    status: focus.status as FocusDto['status'],
    startedAt: focus.startedAt.toISOString(),
    endedAt: focus.endedAt?.toISOString() ?? null,
    elapsedSeconds: focus.elapsedSeconds,
    dateKey: focus.dateKey,
  }
}

function toSleepDto(row: {
  dateKey: string
  quality: number
  bedAt: string | null
  wakeAt: string | null
}): SleepDto {
  return {
    dateKey: row.dateKey,
    quality: row.quality,
    bedAt: row.bedAt,
    wakeAt: row.wakeAt,
  }
}
