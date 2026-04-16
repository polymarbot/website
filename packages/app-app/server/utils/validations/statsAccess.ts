/**
 * Stats Access Validation Utilities
 *
 * Validates user's stats access permissions based on subscription plan.
 */

import { getUserSubscription } from './subscription'

/** Date range preset to days mapping */
const STATS_PRESET_DAYS: Record<StatsDatePresetType, number | null> = {
  [StatsDatePreset.WEEK]: 7,
  [StatsDatePreset.MONTH]: 30,
  [StatsDatePreset.QUARTER]: 90,
  [StatsDatePreset.ALL]: MAX_DATE_RANGE_DAYS,
  [StatsDatePreset.CUSTOM]: null,
}

/**
 * Time range result from preset calculation
 */
export interface TimeRangeResult {
  startTime?: number
  endTime?: number
}

/**
 * Calculate start/end time from date preset
 *
 * @param preset - The date range preset
 * @param customStart - Optional custom start time (only used when preset is CUSTOM)
 * @param customEnd - Optional custom end time (only used when preset is CUSTOM)
 * @returns Time range with startTime and endTime (undefined if ALL or no limit)
 */
export function getTimeRangeFromPreset (
  preset: StatsDatePresetType,
  customStart?: number,
  customEnd?: number,
): TimeRangeResult {
  if (preset === StatsDatePreset.CUSTOM) {
    return {
      startTime: customStart,
      endTime: customEnd,
    }
  }

  const days = STATS_PRESET_DAYS[preset]
  if (days === null) {
    return {}
  }

  const now = Date.now()
  const startTime = now - days * 24 * 60 * 60 * 1000
  return {
    startTime: Math.floor(startTime / 1000),
  }
}

/**
 * Stats access validation result
 */
export interface StatsAccessValidationResult {
  /** Whether user has access to stats */
  hasAccess: boolean
  /** Effective stats access level (after checking expiration) */
  effectiveLevel: StatsAccessType
}

/**
 * Validate user's stats access permission
 *
 * @param userId - User ID to validate
 * @param datePreset - The date preset to access
 * @param options.botId - Optional bot ID filter (requires FULL access)
 * @throws ApiError with 403 status if access denied
 */
export async function validateStatsAccess (
  userId: string,
  datePreset: StatsDatePresetType,
  options?: { botId?: string },
): Promise<StatsAccessValidationResult> {
  const subscription = await getUserSubscription(userId)
  const effectiveLevel = getPlanLimits(subscription.plan, subscription.expiresAt).statsAccess

  // Check if user can access the specified preset
  if (!STATS_ACCESS_PERMISSIONS[effectiveLevel].datePresets.includes(datePreset)) {
    throwApiError(403, ERROR_CODES.SUBSCRIPTION_STATS_ACCESS_DENIED, {
      level: effectiveLevel,
      requestedPreset: datePreset,
    })
  }

  // Bot filter permission check
  if (options?.botId && !STATS_ACCESS_PERMISSIONS[effectiveLevel].botFilter) {
    throwApiError(403, ERROR_CODES.SUBSCRIPTION_STATS_ACCESS_DENIED)
  }

  return {
    hasAccess: true,
    effectiveLevel,
  }
}
