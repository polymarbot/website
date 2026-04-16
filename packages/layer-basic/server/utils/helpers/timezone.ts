/**
 * Normalize a timezone string to its canonical IANA name recognized by PostgreSQL.
 * Uses Intl.DateTimeFormat to automatically resolve deprecated names (e.g. Asia/Calcutta → Asia/Kolkata).
 * Falls back to 'UTC' if the timezone is empty or invalid.
 */
export function normalizeTimezone (tz: string | undefined | null): string {
  if (!tz) return 'UTC'
  try {
    return Intl.DateTimeFormat(undefined, { timeZone: tz }).resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}
