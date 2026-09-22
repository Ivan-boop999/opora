import { describe, expect, test } from 'bun:test'
import type { PracticeDto } from '@opora/contracts'

import { recommend } from './recommendation-engine'

function card(overrides: Partial<PracticeDto> & { code: string }): PracticeDto {
  const { code, ...rest } = overrides
  const defined = Object.fromEntries(
    Object.entries(rest).filter(([, value]) => value !== undefined),
  ) as Partial<PracticeDto>
  return {
    code,
    version: 1,
    title: overrides.title ?? `Карточка ${overrides.code}`,
    summary: '',
    category: 'grounding',
    tags: [],
    estimatedMinutes: 2,
    effort: 'low',
    contexts: [],
    requirements: [],
    exclusions: [],
    steps: [{ text: 'шаг' }],
    easierVariant: 'проще',
    alternativeCodes: [],
    reviewStatus: 'published',
    publishedAt: '2026-09-22T00:00:00Z',
    stopGuidance: null,
    ...defined,
  }
}

const pool = [
  card({ code: 'P01', category: 'grounding', estimatedMinutes: 1 }),
  card({ code: 'P07', category: 'movement', estimatedMinutes: 1 }),
  card({ code: 'P08', category: 'movement', estimatedMinutes: 2, exclusions: ['seated'] }),
  card({ code: 'P13', category: 'starting', estimatedMinutes: 2 }),
  card({ code: 'P16', category: 'starting', estimatedMinutes: 2, effort: 'medium' }),
  card({ code: 'P11', category: 'movement', estimatedMinutes: 10, effort: 'medium' }),
]

describe('recommend', () => {
  test('filters unpublished cards', () => {
    const decision = recommend({
      practices: [card({ code: 'P99', reviewStatus: 'draft' }), ...pool],
      excludedCodes: new Set(),
      favoriteCodes: new Set(),
      restrictions: [],
      lastShownCodes: [],
      recentSessionCodes: [],
    })
    expect(decision?.practice?.code).not.toBe('P99')
  })

  test('excluded codes never come back', () => {
    const decision = recommend({
      practices: pool,
      excludedCodes: new Set(['P01', 'P07', 'P08', 'P13', 'P16', 'P11']),
      favoriteCodes: new Set(),
      restrictions: [],
      lastShownCodes: [],
      recentSessionCodes: [],
    })
    expect(decision).toBeNull()
  })

  test('respects the seated restriction', () => {
    const decision = recommend({
      practices: pool,
      excludedCodes: new Set(),
      favoriteCodes: new Set(),
      restrictions: ['seated'],
      lastShownCodes: [],
      recentSessionCodes: [],
    })
    expect(decision?.practice.code).not.toBe('P08')
  })

  test('the named need picks its category', () => {
    const decision = recommend({
      practices: pool,
      need: 'start',
      excludedCodes: new Set(),
      favoriteCodes: new Set(),
      restrictions: [],
      lastShownCodes: [],
      recentSessionCodes: [],
    })
    expect(decision === null || ['P13', 'P16'].includes(decision.practice.code)).toBe(true)
  })

  test('short minutes drop long cards for a tired user', () => {
    const decision = recommend({
      practices: pool,
      minutesAvailable: 3,
      excludedCodes: new Set(),
      favoriteCodes: new Set(),
      restrictions: [],
      lastShownCodes: [],
      recentSessionCodes: [],
    })
    expect(decision?.practice?.estimatedMinutes).toBeLessThanOrEqual(3)
    expect(decision?.practice?.code).not.toBe('P11')
  })

  test('low effort beats medium for the same category', () => {
    const decision = recommend({
      practices: pool,
      need: 'start',
      excludedCodes: new Set(),
      favoriteCodes: new Set(),
      restrictions: [],
      lastShownCodes: [],
      recentSessionCodes: [],
    })
    expect(decision?.practice?.code).toBe('P13')
  })

  test('returns alternatives that differ from the pick', () => {
    const decision = recommend({
      practices: pool,
      excludedCodes: new Set(),
      favoriteCodes: new Set(),
      restrictions: [],
      lastShownCodes: [],
      recentSessionCodes: [],
    })
    expect(decision?.alternatives.length).toBeGreaterThan(0)
    expect(decision?.alternatives.map((p: PracticeDto) => p.code)).not.toContain(decision?.practice?.code)
  })

  test('the reason is human-readable and non-empty', () => {
    const decision = recommend({
      practices: pool,
      need: 'calm-down',
      minutesAvailable: 5,
      excludedCodes: new Set(),
      favoriteCodes: new Set(),
      restrictions: [],
      lastShownCodes: [],
      recentSessionCodes: [],
    })
    expect(decision?.reason.length).toBeGreaterThan(3)
  })
})
