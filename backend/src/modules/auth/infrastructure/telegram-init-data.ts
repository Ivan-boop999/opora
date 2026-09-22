import { createHmac, timingSafeEqual } from 'node:crypto'

import { AuthFailure } from '../domain/errors'
import type { TelegramInitDataVerifier, TelegramInitUser } from '../application/ports'

/**
 * Verifies Telegram WebApp initData exactly the way @telegram's docs prescribe:
 *
 *   secret_key    = HMAC_SHA256(key = "WebAppData", data = bot_token)
 *   computed_hash = HMAC_SHA256(key = secret_key, data = data_check_string)
 *
 * data_check_string is every received field except `hash` (and the legacy `signature`),
 * sorted by key, joined as `key=value` with newlines. `auth_date` must be recent, and the
 * parsed `user` object must carry a numeric id. Everything else in initData is untrusted
 * input; nothing here reads it.
 */
export function createTelegramInitDataVerifier(input: {
  botToken: string
  maxAgeSeconds: number
  now?: () => Date
}): TelegramInitDataVerifier {
  const now = input.now ?? (() => new Date())
  const secretKey = createHmac('sha256', 'WebAppData').update(input.botToken).digest()

  return {
    verify(initData: string): TelegramInitUser {
      const params = new URLSearchParams(initData)
      const providedHash = params.get('hash')
      params.delete('signature')
      params.delete('hash')
      if (!providedHash) {
        throw new AuthFailure('telegram_initdata_invalid', 'initData signature is missing')
      }

      const dataCheckString = [...params.entries()]
        .map(([key, value]) => `${key}=${value}`)
        .sort()
        .join('\n')
      const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest()

      const provided = Buffer.from(providedHash, 'hex')
      if (
        provided.length !== computedHash.length ||
        !timingSafeEqual(provided, computedHash)
      ) {
        throw new AuthFailure('telegram_initdata_invalid', 'initData signature is invalid')
      }

      const authDateSeconds = Number(params.get('auth_date'))
      if (!Number.isInteger(authDateSeconds) || authDateSeconds <= 0) {
        throw new AuthFailure('telegram_initdata_invalid', 'initData auth_date is invalid')
      }
      const ageSeconds = Math.floor(now().getTime() / 1000) - authDateSeconds
      if (ageSeconds > input.maxAgeSeconds) {
        throw new AuthFailure('telegram_initdata_expired', 'initData is too old')
      }

      let parsedUser: unknown
      try {
        parsedUser = JSON.parse(params.get('user') ?? '')
      } catch {
        throw new AuthFailure('telegram_initdata_invalid', 'initData user is invalid')
      }
      if (typeof parsedUser !== 'object' || parsedUser === null) {
        throw new AuthFailure('telegram_initdata_invalid', 'initData user is invalid')
      }
      const raw = parsedUser as Record<string, unknown>
      const id = typeof raw.id === 'number' && Number.isSafeInteger(raw.id) && raw.id > 0
        ? String(raw.id)
        : null
      if (!id) {
        throw new AuthFailure('telegram_initdata_invalid', 'initData user id is invalid')
      }

      return {
        id,
        firstName: typeof raw.first_name === 'string' ? raw.first_name : undefined,
        lastName: typeof raw.last_name === 'string' ? raw.last_name : undefined,
        username: typeof raw.username === 'string' ? raw.username : undefined,
        photoUrl: typeof raw.photo_url === 'string' ? raw.photo_url : undefined,
      }
    },
  }
}
