import type { Dayjs, ConfigType } from 'dayjs'
import type { DurationUnitType } from 'dayjs/plugin/duration'
import { setDayjsLocale, getDayjsLocale } from '~/plugins/dayjs'

/**
 * Composable for using dayjs with automatic locale synchronization
 *
 * The dayjs instance automatically follows the app's current locale.
 * When the locale changes, dayjs locale is updated via lazy loading.
 */
export function useDate () {
  const { $dayjs } = useNuxtApp()
  const { locale, t } = useI18n()

  // Watch for locale changes and update dayjs locale
  watch(locale, async newLocale => {
    await setDayjsLocale(newLocale)
  }, { immediate: true })

  /**
   * Create a dayjs instance with current locale
   */
  function dayjs (date?: ConfigType): Dayjs {
    return $dayjs(date).locale(getDayjsLocale(locale.value))
  }

  /**
   * Create a duration instance with current locale
   */
  function duration (time: number, unit?: DurationUnitType) {
    return $dayjs.duration(time, unit).locale(getDayjsLocale(locale.value))
  }

  /**
   * Format a date with the current locale
   */
  function formatDate (date: ConfigType, format?: string): string {
    return dayjs(date).format(format ?? t('common.formats.date'))
  }

  /**
   * Format a date with time using the current locale
   */
  function formatDateTime (date: ConfigType, format?: string): string {
    return dayjs(date).format(format ?? t('common.formats.dateTime'))
  }

  /**
   * Get relative time from now (e.g., "2 hours ago")
   */
  function fromNow (date: ConfigType): string {
    return dayjs(date).fromNow()
  }

  /**
   * Get relative time to now (e.g., "in 2 hours")
   */
  function toNow (date: ConfigType): string {
    return dayjs(date).toNow()
  }

  /**
   * Format duration to localized string (e.g., "2 hours", "3 days")
   * Uses dayjs humanize() which outputs the largest unit only
   */
  function humanizeDuration (seconds: number): string {
    return duration(seconds, 'seconds').humanize()
  }

  /**
   * Format duration to localized compact string
   * - English: "1d 8m 24s"
   * - Chinese/Japanese: "1天 8分 24秒"
   * Zero-value units in the middle are omitted for cleaner output.
   * @param value - The duration value
   * @param unit - The unit of the value ('seconds' | 'minutes'), defaults to 'seconds'
   */
  function formatDuration (value: number, unit: 'seconds' | 'minutes' = 'seconds'): string {
    const totalSeconds = unit === 'minutes' ? value * 60 : value

    // Handle zero or negative values - display as "0m" or "0s" based on unit
    if (totalSeconds <= 0) {
      const zeroUnit = unit === 'minutes'
        ? t('common.formats.duration.minutes')
        : t('common.formats.duration.seconds')
      return `0${zeroUnit}`
    }

    const dur = $dayjs.duration(totalSeconds, 'seconds')
    const days = Math.floor(dur.asDays())
    const hours = dur.hours()
    const minutes = dur.minutes()
    const seconds = dur.seconds()

    // Build parts with localized suffixes, only include non-zero values
    const parts: string[] = []
    if (days > 0) parts.push(`${days}${t('common.formats.duration.days')}`)
    if (hours > 0) parts.push(`${hours}${t('common.formats.duration.hours')}`)
    if (minutes > 0) parts.push(`${minutes}${t('common.formats.duration.minutes')}`)
    if (seconds > 0) parts.push(`${seconds}${t('common.formats.duration.seconds')}`)

    return parts.length > 0 ? parts.join(' ') : '-'
  }

  /**
   * Format a time range to compact string (e.g., "30m - 1h30m", "0m - 10m")
   * @param start - Start time value
   * @param end - End time value
   * @param unit - The unit of the values ('seconds' | 'minutes'), defaults to 'minutes'
   */
  function formatTimeRange (start: number, end: number, unit: 'seconds' | 'minutes' = 'minutes'): string {
    return `${formatDuration(start, unit)} - ${formatDuration(end, unit)}`
  }

  /**
   * Format a date range with localized date/time formatting
   * @param startDate - Start date (Date object, ISO string, or Unix timestamp in seconds)
   * @param endDate - End date (Date object, ISO string, or Unix timestamp in seconds)
   * @returns Formatted date range string, or '-' if invalid
   */
  function formatDateRange (startDate: ConfigType, endDate: ConfigType): string {
    if (!startDate || !endDate) return '-'

    // Convert to dayjs instances
    // If input is a number, treat it as Unix timestamp in seconds
    const start = typeof startDate === 'number' ? dayjs(startDate * 1000) : dayjs(startDate)
    const end = typeof endDate === 'number' ? dayjs(endDate * 1000) : dayjs(endDate)

    // Validate dates
    if (!start.isValid() || !end.isValid()) return '-'

    // Get localized date formats
    const dateFormat = t('common.formats.dateRange.date')
    const dateTimeFormat = t('common.formats.dateRange.dateTime')

    // Check if same day
    const isSameDay = start.isSame(end, 'day')

    if (isSameDay) {
      // Same day: only show one date with time range
      const date = start.format(dateFormat)
      const startTime = start.format('HH:mm')
      const endTime = end.format('HH:mm')
      return `${date} ${startTime}-${endTime}`
    } else {
      // Different days: show full start and end date-time
      const startStr = start.format(dateTimeFormat)
      const endStr = end.format(dateTimeFormat)
      return `${startStr} - ${endStr}`
    }
  }

  return {
    dayjs,
    duration,
    formatDate,
    formatDateTime,
    fromNow,
    toNow,
    humanizeDuration,
    formatDuration,
    formatTimeRange,
    formatDateRange,
  }
}
