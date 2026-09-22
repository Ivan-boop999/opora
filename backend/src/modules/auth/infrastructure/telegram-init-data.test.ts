import { describe, expect, test } from 'bun:test'
import { createHmac } from 'node:crypto'

import { createTelegramInitDataVerifier } from './telegram-init-data'

const botToken = '8889581458:test-bot-token-value-abcdef'
const now = new Date('2026-09-22T12:00:00Z')

function buildInitData(fields: Record<string, string>) {
  const params = new URLSearchParams(fields)
  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== 'hash' && key !== 'signature')
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n')
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  params.set('hash', hash)
  return params.toString()
}

const validFields = {
  auth_date: String(Math.floor(now.getTime() / 1000) - 60),
  query_id: 'AAF1',
  user: JSON.stringify({ id: 4242, first_name: 'Иван', username: 'ivan_t' }),
}

const verifier = () =>
  createTelegramInitDataVerifier({ botToken, maxAgeSeconds: 3600, now: () => now })

describe('createTelegramInitDataVerifier', () => {
  test('accepts correctly signed fresh initData and parses the user', () => {
    const user = verifier().verify(buildInitData(validFields))
    expect(user.id).toBe('4242')
    expect(user.firstName).toBe('Иван')
    expect(user.username).toBe('ivan_t')
  })

  test('rejects initData signed for a different bot', () => {
    const forged = createTelegramInitDataVerifier({
      botToken: '0000000000:other-bot',
      maxAgeSeconds: 3600,
      now: () => now,
    })
    expect(() => forged.verify(buildInitData(validFields))).toThrow()
  })

  test('rejects tampered payload fields', () => {
    const signed = buildInitData(validFields)
    const tampered = signed.replace('ivan_t', 'attacker')
    expect(() => verifier().verify(tampered)).toThrow()
  })

  test('rejects stale initData beyond the age limit', () => {
    const stale = {
      ...validFields,
      auth_date: String(Math.floor(now.getTime() / 1000) - 7200),
    }
    expect(() => verifier().verify(buildInitData(stale))).toThrow()
  })

  test('rejects initData without a user id', () => {
    const noUser = { auth_date: validFields.auth_date, query_id: 'AAF1' }
    expect(() => verifier().verify(buildInitData(noUser))).toThrow()
  })

  test('rejects unsigned input outright', () => {
    expect(() => verifier().verify('user=%7B%7D&auth_date=1')).toThrow()
  })
})
