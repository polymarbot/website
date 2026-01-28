/**
 * Stats Access Permissions
 *
 * This module defines stats access permissions based on subscription plans.
 * Used to control which date range presets are available for each plan level.
 */

import { SubscriptionPlan, type SubscriptionPlanType } from '../types/db'
import { isSubscriptionExpired } from './subscription'

/** Date range preset types for statistics access */
export const StatsDatePreset = {
  WEEK: 'WEEK',
  MONTH: 'MONTH',
  QUARTER: 'QUARTER',
  ALL: 'ALL',
  CUSTOM: 'CUSTOM',
} as const

export type StatsDatePresetType = (typeof StatsDatePreset)[keyof typeof StatsDatePreset]

/** Stats access configuration for each plan */
export interface StatsAccessConfig {
  /** Allowed date range presets for this plan */
  allowedPresets: StatsDatePresetType[]
  /** Whether this plan has full stats access (including custom date range) */
  hasFullAccess: boolean
}

/**
 * Stats access permissions by subscription plan
 *
 * - FREE: No access (returns mock data with blur overlay)
 * - PRO: Access to QUARTER preset only
 * - PLUS/MAX: Full access including ALL and CUSTOM
 */
export const STATS_ACCESS_BY_PLAN: Record<SubscriptionPlanType, StatsAccessConfig> = {
  [SubscriptionPlan.FREE]: {
    allowedPresets: [],
    hasFullAccess: false,
  },
  [SubscriptionPlan.PRO]: {
    allowedPresets: [ StatsDatePreset.QUARTER ],
    hasFullAccess: false,
  },
  [SubscriptionPlan.PLUS]: {
    allowedPresets: [
      StatsDatePreset.WEEK,
      StatsDatePreset.MONTH,
      StatsDatePreset.QUARTER,
      StatsDatePreset.ALL,
      StatsDatePreset.CUSTOM,
    ],
    hasFullAccess: true,
  },
  [SubscriptionPlan.MAX]: {
    allowedPresets: [
      StatsDatePreset.WEEK,
      StatsDatePreset.MONTH,
      StatsDatePreset.QUARTER,
      StatsDatePreset.ALL,
      StatsDatePreset.CUSTOM,
    ],
    hasFullAccess: true,
  },
}

/**
 * Check if a plan can access a specific stats date preset
 *
 * @param plan - The subscription plan type
 * @param preset - The date preset to check
 * @returns true if the plan can access the preset
 */
export function canAccessStatsPreset (
  plan: SubscriptionPlanType,
  preset: StatsDatePresetType,
): boolean {
  const config = STATS_ACCESS_BY_PLAN[plan]
  return config.allowedPresets.includes(preset)
}

/**
 * Get effective plan for stats access (treats expired as FREE)
 *
 * @param plan - The subscription plan type
 * @param expiresAt - The expiration date of the subscription
 * @returns The effective plan for stats access
 */
export function getEffectiveStatsAccessPlan (
  plan: SubscriptionPlanType,
  expiresAt: Date | null,
): SubscriptionPlanType {
  if (isSubscriptionExpired(plan, expiresAt)) {
    return SubscriptionPlan.FREE
  }
  return plan
}

/**
 * Get default date preset based on subscription plan
 *
 * - FREE: WEEK (will show mock data)
 * - PRO: QUARTER (only option available)
 * - PLUS/MAX: WEEK (full access)
 *
 * @param plan - The subscription plan type
 * @returns The default date preset for the plan
 */
export function getDefaultStatsPreset (plan: SubscriptionPlanType): StatsDatePresetType {
  if (plan === SubscriptionPlan.PRO) {
    return StatsDatePreset.QUARTER
  }
  return StatsDatePreset.WEEK
}
