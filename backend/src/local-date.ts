/**
 * Local-day keys. The product groups rewards and histories by a user's local
 * date ("YYYY-MM-DD"), derived from the timezone in their preferences. Events
 * themselves stay UTC; only day boundaries use this helper.
 *
 * Rule for timezone changes: the dateKey is computed at write time from the
 * timezone the user currently has set. A change can move the boundary of the
 * new day but never rewrites existing rows, so daily caps stay bounded.
 */
export function localDateKey(
  now: Date,
  timezone: string,
): string {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  return formatted
}

/** Minutes since local midnight in the given timezone. */
export function localMinutesOfDay(now: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)
  const [hours, minutes] = parts.split(':').map(Number)
  return hours * 60 + minutes
}

/** Day-of-week in the given timezone, ISO numbering 1..7 (Mon..Sun). */
export function localWeekday(now: Date, timezone: string): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(now)
  const names: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
  return names[weekday] ?? 1
}

export function dateKeyMinusDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}
