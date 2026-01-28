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
  [StatsDatePreset.ALL]: null,
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
  /** Effective subscription plan (after checking expiration) */
  effectivePlan: SubscriptionPlanType
}

/**
 * Validate user's stats access permission for a specific date preset
 *
 * @param userId - User ID to validate
 * @param datePreset - The date preset to access
 * @throws ApiError with 403 status if access denied
 */
export async function validateStatsAccess (
  userId: string,
  datePreset: StatsDatePresetType,
): Promise<StatsAccessValidationResult> {
  const subscription = await getUserSubscription(userId)
  const effectivePlan = getEffectiveStatsAccessPlan(subscription.plan, subscription.expiresAt)

  // Check if user can access the specified preset
  if (!canAccessStatsPreset(effectivePlan, datePreset)) {
    throwApiError(403, ERROR_CODES.SUBSCRIPTION_STATS_ACCESS_DENIED, {
      plan: effectivePlan,
      requestedPreset: datePreset,
    })
  }

  return {
    hasAccess: true,
    effectivePlan,
  }
}
