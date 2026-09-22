import type { CookieRefreshResponse } from '@opora/contracts'
import { ApiRequestError } from '@/platform/api'
import { telegram } from '@/platform/telegram'

import type { AuthApi } from './api'

type BootstrapAuthSessionOptions = {
  api: Pick<AuthApi, 'clearSession' | 'refresh' | 'loginWithTelegram'>
  shouldApply: () => boolean
  setAccessToken: (accessToken: string | null) => void
}

/**
 * Inside Telegram the cookie may be absent on the very first launch. The signed
 * initData the client already holds is then the only way in: verify it server
 * side and open a session. Outside Telegram this path stays dormant.
 */
async function bootstrapTelegramSession(
  api: Pick<AuthApi, 'loginWithTelegram'>,
  shouldApply: () => boolean,
  setAccessToken: (accessToken: string | null) => void,
) {
  const initData = telegram.initData
  if (!initData) return false
  const { data } = await api.loginWithTelegram({ initData })
  if (shouldApply()) {
    setAccessToken(data.accessToken)
  }
  return true
}

let bootstrapRefreshPromise: Promise<CookieRefreshResponse> | null = null

export async function bootstrapAuthSession({
  api,
  shouldApply,
  setAccessToken,
}: BootstrapAuthSessionOptions) {
  try {
    const response = await refreshBootstrapSession(api)

    if (shouldApply()) {
      setAccessToken(response.accessToken)
    }
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      try {
        if (await bootstrapTelegramSession(api, shouldApply, setAccessToken)) return
      } catch (telegramError) {
        if (shouldApply()) {
          await api.clearSession()
        }
        throw telegramError
      }
      if (shouldApply()) {
        await api.clearSession()
      }
      return
    }

    throw error
  }
}

function refreshBootstrapSession(api: Pick<AuthApi, 'refresh'>) {
  bootstrapRefreshPromise ??= api.refresh().finally(() => {
    bootstrapRefreshPromise = null
  })

  return bootstrapRefreshPromise
}
