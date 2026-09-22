export type AuthFailureKind =
  | 'access_token_invalid'
  | 'access_token_required'
  | 'email_already_exists'
  | 'invalid_credentials'
  | 'password_reset_invalid'
  | 'refresh_session_invalid'
  | 'refresh_token_required'
  | 'session_invalid'
  | 'telegram_initdata_expired'
  | 'telegram_initdata_invalid'
  | 'telegram_unavailable'

export class AuthFailure extends Error {
  constructor(
    public readonly kind: AuthFailureKind,
    message: string,
  ) {
    super(message)
  }
}
