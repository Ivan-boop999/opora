import { describe, expect, test } from 'bun:test'

import { elapsedFromMarks } from '../infrastructure/plans-repository'

describe('focus elapsed arithmetic (§32.9)', () => {
  const minutes = (value: number) => `2026-09-22T10:${String(value).padStart(2, '0')}:00Z`

  test('counts only running spans, not paused time', () => {
    const marks = [
      { at: minutes(0), type: 'start' },
      { at: minutes(5), type: 'pause' },
      { at: minutes(20), type: 'resume' },
      { at: minutes(25), type: 'pause' },
    ]
    expect(elapsedFromMarks(marks, new Date('2026-09-22T10:30:00Z'))).toBe(10 * 60)
  })

  test('an open span runs until now', () => {
    const marks = [{ at: minutes(0), type: 'start' }]
    expect(elapsedFromMarks(marks, new Date('2026-09-22T10:02:30Z'))).toBe(150)
  })

  test('collapse during a cold start counts nothing lost before start', () => {
    const marks = [{ at: '2026-09-22T10:00:00Z', type: 'start' }]
    expect(elapsedFromMarks(marks, new Date('2026-09-22T10:00:00Z'))).toBe(0)
  })

  test('double pause does not double-count', () => {
    const marks = [
      { at: minutes(0), type: 'start' },
      { at: minutes(5), type: 'pause' },
      { at: minutes(8), type: 'pause' },
    ]
    expect(elapsedFromMarks(marks, new Date('2026-09-22T10:60:00Z'))).toBe(5 * 60)
  })
})
