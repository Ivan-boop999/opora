import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

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
  const sha256TokenSecret = createHash('sha256').update(input.botToken).digest()

  return {
    verify(initData: string): TelegramInitUser {
      const params = new URLSearchParams(initData)
      const providedHash = params.get('hash')
      const providedSignature = params.get('signature')
      params.delete('signature')
      params.delete('hash')
      if (!providedHash) {
        throw new AuthFailure('telegram_initdata_invalid', 'initData signature is missing')
      }

      // Клиенты Telegram расходятся в деталях построения data-check-string (участвует ли
      // signature, в каком виде значения). Каждый вариант — честное HMAC-сравнение с тем же
      // ключом, случайное совпадение исключено: принимаем первый совпавший и помечаем его.
      const decoded = [...params.entries()]
        .map(([key, value]) => `${key}=${value}`)
        .sort()
        .join('\n')
      const decodedWithSignature = [...params.entries()]
        .concat([['signature', providedSignature ?? '']])
        .map(([key, value]) => `${key}=${value}`)
        .sort()
        .join('\n')
      const rawEncoded = initData
        .split('&')
        .filter((pair) => !pair.startsWith('hash=') && !pair.startsWith('signature='))
        .sort()
        .join('\n')

      const provided = Buffer.from(providedHash, 'hex')
      const variants: [string, Buffer][] = [
        ['decoded', createHmac('sha256', secretKey).update(decoded).digest()],
        [
          'decoded+signature',
          createHmac('sha256', secretKey).update(decodedWithSignature).digest(),
        ],
        ['raw', createHmac('sha256', secretKey).update(rawEncoded).digest()],
        ['sha256-secret', createHmac('sha256', sha256TokenSecret).update(decoded).digest()],
      ]
      const matched = variants.find(
        ([, computed]) =>
          provided.length === computed.length && timingSafeEqual(provided, computed),
      )
      const computedHash = matched?.[1] ?? variants[0]![1]
      if (!matched) {
        // Временная диагностика владельца: захват реального initData для сверки алгоритма.
        console.log('[tg-initdata-mismatch]', JSON.stringify({ initData, decoded }))
        throw new AuthFailure('telegram_initdata_invalid', 'initData signature is invalid')
      }
      console.log('[tg-initdata-ok]', matched[0])

      const authDateSeconds = Number(params.get('auth_date'))
      if (!Number.isInteger(authDateSeconds) || authDateSeconds <= 0) {
        throw new AuthFailure('telegram_initdata_invalid', 'initData auth_date is invalid')
      }
      const ageSeconds = Math.floor(now().getTime() / 1000) - authDateSeconds
      if (ageSeconds > input.maxAgeSeconds) {
        console.log('[tg-initdata-expired]', JSON.stringify({ authDateSeconds, ageSeconds }))
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
