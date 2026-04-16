/**
 * Stats Access Permissions
 *
 * This module defines stats query permissions based on StatsAccessType.
 * Used to control which features are available for each access level.
 */

/** Date range preset types for statistics access */
export const StatsDatePreset = {
  WEEK: 'WEEK',
  MONTH: 'MONTH',
  QUARTER: 'QUARTER',
  ALL: 'ALL',
  CUSTOM: 'CUSTOM',
} as const

export type StatsDatePresetType = (typeof StatsDatePreset)[keyof typeof StatsDatePreset]

/** Maximum date range span in days (1 year) */
export const MAX_DATE_RANGE_DAYS = 365

/**
 * Stats query permissions per access level
 */
export interface StatsAccessPermissions {
  datePresets: StatsDatePresetType[]
  botFilter: boolean
}

/**
 * Stats query permissions by access level
 *
 * - NONE: No access
 * - PARTIAL: QUARTER only, no bot filter
 * - EXTENDED: WEEK, MONTH, QUARTER, no bot filter
 * - FULL: All presets including ALL/CUSTOM, bot filter enabled
 */
export const STATS_ACCESS_PERMISSIONS: Record<StatsAccessType, StatsAccessPermissions> = {
  [StatsAccess.NONE]: { datePresets: [], botFilter: false },
  [StatsAccess.PARTIAL]: { datePresets: [ StatsDatePreset.QUARTER ], botFilter: false },
  [StatsAccess.EXTENDED]: {
    datePresets: [ StatsDatePreset.WEEK, StatsDatePreset.MONTH, StatsDatePreset.QUARTER ],
    botFilter: false,
  },
  [StatsAccess.FULL]: {
    datePresets: [
      StatsDatePreset.WEEK,
      StatsDatePreset.MONTH,
      StatsDatePreset.QUARTER,
      StatsDatePreset.ALL,
      StatsDatePreset.CUSTOM,
    ],
    botFilter: true,
  },
}

/**
 * Find the minimum subscription plan required for a specific stats feature.
 * Iterates plans from lowest to highest and returns the first match.
 * Returns FREE if no plan restricts the feature.
 */
export function getRequiredPlanForStats (feature: 'botFilter'): SubscriptionPlanType
export function getRequiredPlanForStats (feature: 'datePreset', value: StatsDatePresetType): SubscriptionPlanType
export function getRequiredPlanForStats (feature: 'botFilter' | 'datePreset', value?: StatsDatePresetType): SubscriptionPlanType {
  for (const plan of PLAN_ORDER) {
    const perms = STATS_ACCESS_PERMISSIONS[SUBSCRIPTION_PLANS[plan].limits.statsAccess]
    if (feature === 'botFilter' && perms.botFilter) return plan
    if (feature === 'datePreset' && perms.datePresets.includes(value!)) return plan
  }
  return SubscriptionPlan.FREE
}
