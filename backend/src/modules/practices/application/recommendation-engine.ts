import type {
  Need,
  PracticeDto,
} from '@opora/contracts'

export const RECOMMENDATION_RULES_VERSION = 'rules-v1'

export type RecommendationCandidate = PracticeDto & { hidden?: boolean }

export type RecommendationInput = {
  practices: RecommendationCandidate[]
  need?: Need
  minutesAvailable?: number
  excludedCodes: Set<string>
  favoriteCodes: Set<string>
  restrictions: string[]
  lastShownCodes: string[]
  recentSessionCodes: string[]
  activeProgramPracticeCode?: string | null
}

export type RecommendationDecision = {
  practice: PracticeDto
  reason: string
  alternatives: PracticeDto[]
}

/**
 * Deterministic, explainable card choice. Priorities (per product spec):
 *   1. the need the user named;
 *   2. feasibility: time and effort;
 *   3. personal preferences (favorites first, exclusions never);
 *   4. variety: nothing shown in the last few picks, if choice remains;
 *   5. the active program's card when it fits the current conditions.
 *
 * No hidden pseudo-medical scoring: every step is a visible filter or sort with
 * a human-readable reason the interface can quote verbatim.
 */
export function recommend(input: RecommendationInput): RecommendationDecision | null {
  const reasons: string[] = []

  let pool = input.practices.filter(
    (practice) => practice.reviewStatus === 'published' && !practice.hidden,
  )
  if (pool.length === 0) return null

  // Hard filters first: user exclusions and restrictions always win.
  pool = pool.filter((practice) => !input.excludedCodes.has(practice.code))
  if (input.restrictions.length > 0) {
    pool = pool.filter((practice) =>
      input.restrictions.every((restriction) => !practice.exclusions.includes(restriction)),
    )
  }
  if (pool.length === 0) return null

  // Time: drop cards that cannot fit the minutes the user has.
  if (input.minutesAvailable !== undefined) {
    const fitting = pool.filter(
      (practice) => practice.estimatedMinutes <= Math.max(input.minutesAvailable!, 2),
    )
    if (fitting.length > 0) {
      pool = fitting
      reasons.push('укладывается в твоё время')
    }
  }

  // The need the user named maps to categories; cards outside it stay as backup
  // when nothing matches, because an honest alternative beats an empty screen.
  if (input.need) {
    const categories = needCategories(input.need)
    const matching = pool.filter((practice) => categories.includes(practice.category))
    if (matching.length > 0) {
      pool = matching
      reasons.push(needReason(input.need))
    }
  }

  // Low effort first: for a tired person the engine never proposes a long active
  // practice just to satisfy a program.
  const sorted = [...pool].sort((left, right) => {
    const effortScore = (practice: PracticeDto) => (practice.effort === 'low' ? 0 : 1)
    const favoriteScore = (practice: PracticeDto) => (input.favoriteCodes.has(practice.code) ? -1 : 0)
    const freshnessScore = (practice: PracticeDto) =>
      input.lastShownCodes.slice(-3).includes(practice.code) ? 2 : 0
    const repetitionScore = (practice: PracticeDto) =>
      input.recentSessionCodes.slice(-2).includes(practice.code) ? 1 : 0
    return (
      favoriteScore(left) - favoriteScore(right) ||
      effortScore(left) - effortScore(right) ||
      repetitionScore(left) - repetitionScore(right) ||
      freshnessScore(left) - freshnessScore(right) ||
      left.code.localeCompare(right.code)
    )
  })

  const programCard = input.activeProgramPracticeCode
    ? sorted.find((practice) => practice.code === input.activeProgramPracticeCode)
    : undefined
  if (programCard && programCard.effort === 'low') {
    reasons.push('шаг твоей программы')
    return withAlternatives(programCard, sorted, reasons)
  }

  const chosen = sorted[0]
  if (!chosen) return null
  if (input.favoriteCodes.has(chosen.code)) reasons.push('в твоём избранном')

  return withAlternatives(chosen, sorted, reasons)
}

function withAlternatives(
  chosen: PracticeDto,
  sorted: PracticeDto[],
  reasons: string[],
): RecommendationDecision {
  return {
    practice: chosen,
    reason: capitalize(reasons.length > 0 ? reasons.join(', ') : 'короткий посильный шаг'),
    alternatives: sorted.filter((practice) => practice.code !== chosen.code).slice(0, 3),
  }
}

const NEED_CATEGORIES: Record<Need, string[]> = {
  'calm-down': ['grounding', 'rest'],
  move: ['movement'],
  start: ['starting'],
  rest: ['rest'],
  connect: ['connection'],
  understand: ['reflection'],
}

function needCategories(need: Need): string[] {
  return NEED_CATEGORIES[need] ?? []
}

function needReason(need: Need): string {
  switch (need) {
    case 'calm-down':
      return 'подходит, чтобы снизить напряжение'
    case 'move':
      return 'подходит, чтобы мягко подвигаться'
    case 'start':
      return 'помогает начать с малого'
    case 'rest':
      return 'подходит для отдыха'
    case 'connect':
      return 'поддерживает связь с людьми'
    case 'understand':
      return 'помогает разобраться в состоянии'
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
