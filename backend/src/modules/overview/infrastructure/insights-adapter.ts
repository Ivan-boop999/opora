import type { z } from 'zod'
import type { insightsResponseSchema } from '@opora/contracts'

import type { DbClient } from '../../../db'

type InsightsData = Omit<z.infer<typeof insightsResponseSchema>, 'period' | 'from'>

/**
 * Aggregates a user's own history. Every number keeps its denominator honest:
 * averages only over days that have the respective scale, counts include
 * partial attempts, and observations require the configured minimum of 5
 * rated attempts across 3+ distinct days before any sentence is built.
 */
export function createInsightsAdapter(db: DbClient) {
  const OBSERVATION_MIN_TRIES = 5
  const OBSERVATION_MIN_DAYS = 3

  return async function insightsData(
    userId: string,
    from: string | null,
    to: string,
  ): Promise<InsightsData> {
    const dateFilter = {
      userId,
      ...(from ? { dateKey: { gte: from, lte: to } } : { dateKey: { lte: to } }),
    }

    const [checkIns, sessions, feedbackRows, sleepRows, enrollment, journalRows] = await Promise.all([
      db.checkIn.findMany({ where: dateFilter, orderBy: { dateKey: 'asc' } }),
      db.practiceSession.findMany({
        where: { ...dateFilter, status: { in: ['completed', 'partial'] } },
        orderBy: { dateKey: 'asc' },
      }),
      db.practiceFeedback.findMany({
        where: {
          session: { ...dateFilter },
        },
        include: { session: { select: { practiceCode: true, dateKey: true } } },
      }),
      db.sleepEntry.findMany({ where: dateFilter }),
      db.programEnrollment.findFirst({
        where: { userId, status: { in: ['active', 'paused'] } },
        include: { programVersion: { include: { program: true } } },
      }),
      db.journalEntry.count({ where: { ...dateFilter, deletedAt: null, isDraft: false } }),
    ])

    // Daily check-in averages (per scale, over days that have it) and a daily grid.
    const byDay = new Map<
      string,
      { mood: number[]; energy: number[]; tension: number[]; actions: number }
    >()
    for (const checkIn of checkIns) {
      const day = byDay.get(checkIn.dateKey) ?? { mood: [], energy: [], tension: [], actions: 0 }
      if (checkIn.mood !== null) day.mood.push(checkIn.mood)
      if (checkIn.energy !== null) day.energy.push(checkIn.energy)
      if (checkIn.tension !== null) day.tension.push(checkIn.tension)
      byDay.set(checkIn.dateKey, day)
    }
    for (const session of sessions) {
      const day = byDay.get(session.dateKey) ?? { mood: [], energy: [], tension: [], actions: 0 }
      day.actions += 1
      byDay.set(session.dateKey, day)
    }

    const allMood = checkIns.filter((row) => row.mood !== null)
    const allEnergy = checkIns.filter((row) => row.energy !== null)
    const allTension = checkIns.filter((row) => row.tension !== null)
    const average = (rows: { [key: string]: unknown }[], key: string) =>
      rows.length > 0
        ? Math.round(
            (rows.reduce((sum, row) => sum + (row[key] as number), 0) / rows.length) * 10,
          ) / 10
        : null

    // Top practices by completed+partial sessions.
    const sessionCounts = new Map<string, number>()
    for (const session of sessions) {
      sessionCounts.set(session.practiceCode, (sessionCounts.get(session.practiceCode) ?? 0) + 1)
    }
    const topCodes = [...sessionCounts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
    const topPractices = await Promise.all(
      topCodes.map(async ([code, times]) => {
        const practice = await db.practice.findUnique({ where: { code } })
        const version = practice
          ? await db.practiceVersion.findFirst({
              where: { practiceId: practice.id },
              orderBy: { version: 'desc' },
            })
          : null
        return { code, title: version?.title ?? code, times }
      }),
    )

    const effectCounts = { easier: 0, same: 0, harder: 0, declined: 0 }
    for (const feedback of feedbackRows) {
      if (feedback.effect in effectCounts) {
        effectCounts[feedback.effect as keyof typeof effectCounts] += 1
      }
    }

    // Cautious observations: enough rated attempts of one card, across days.
    const ratedByCode = new Map<string, { tries: Set<string>; easier: number; rated: number }>()
    for (const feedback of feedbackRows) {
      if (feedback.effect === 'declined') continue
      const entry =
        ratedByCode.get(feedback.session.practiceCode) ??
        { tries: new Set<string>(), easier: 0, rated: 0 }
      entry.tries.add(feedback.session.dateKey)
      entry.rated += 1
      if (feedback.effect === 'easier') entry.easier += 1
      ratedByCode.set(feedback.session.practiceCode, entry)
    }
    const observations = [...ratedByCode.entries()]
      .filter(([, entry]) => entry.tries.size >= OBSERVATION_MIN_DAYS && entry.rated >= OBSERVATION_MIN_TRIES)
      .sort((left, right) => right[1].rated - left[1].rated)
      .slice(0, 3)
      .map(([code, entry]) => ({
        practiceCode: code,
        title: topPractices.find((practice) => practice.code === code)?.title ?? code,
        tries: entry.rated,
        days: entry.tries.size,
        easierCount: entry.easier,
        ratedCount: entry.rated,
      }))

    const daily = [...byDay.entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([dateKey, day]) => ({
        dateKey,
        mood: day.mood.length ? Math.round((day.mood.reduce((a, b) => a + b, 0) / day.mood.length) * 10) / 10 : null,
        energy: day.energy.length ? Math.round((day.energy.reduce((a, b) => a + b, 0) / day.energy.length) * 10) / 10 : null,
        tension: day.tension.length ? Math.round((day.tension.reduce((a, b) => a + b, 0) / day.tension.length) * 10) / 10 : null,
        actions: day.actions,
      }))

    const weekAgo = new Date(Date.now() - 7 * 86400_000)
    const weekly = {
      kindActions: sessions.filter((session) => session.startedAt >= weekAgo).length,
      checkins: checkIns.filter((row) => row.createdAt >= weekAgo).length,
      journalEntries: journalRows,
      topPractice: topPractices[0]?.title ?? null,
    }

    return {
      checkinDays: checkIns.length > 0 ? new Set(checkIns.map((row) => row.dateKey)).size : 0,
      averages:
        checkIns.length > 0
          ? {
              mood: average(allMood as never, 'mood'),
              energy: average(allEnergy as never, 'energy'),
              tension: average(allTension as never, 'tension'),
            }
          : null,
      daily,
      actionTotals: {
        completed: sessions.filter((session) => session.status === 'completed').length,
        partial: sessions.filter((session) => session.status === 'partial').length,
        total: sessions.length,
      },
      topPractices,
      effectCounts,
      observations,
      sleepNights: sleepRows.length,
      sleepAverage: sleepRows.length
        ? Math.round((sleepRows.reduce((sum, row) => sum + row.quality, 0) / sleepRows.length) * 10) / 10
        : null,
      programActive: enrollment
        ? {
            title: enrollment.programVersion.title,
            day: enrollment.currentDay,
            daysCount: enrollment.programVersion.daysCount,
          }
        : null,
      weekly,
    }
  }
}
