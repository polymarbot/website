/**
 * Wallet status to severity color mapping
 * Used for Tag component severity prop
 */
export const WalletStatusSeverityMap: Record<WalletStatusType, string> = {
  [WalletStatus.ACTIVE]: 'success',
  [WalletStatus.DEPLOYING]: 'warn',
  [WalletStatus.FAILED]: 'danger',
  [WalletStatus.INACTIVE]: 'secondary',
}

/**
 * Subscription plan to severity color mapping
 * Used for Badge component severity prop
 */
export const PlanSeverityMap: Record<SubscriptionPlanType, string> = {
  [SubscriptionPlan.FREE]: 'secondary',
  [SubscriptionPlan.PRO]: 'info',
  [SubscriptionPlan.PLUS]: 'warn',
  [SubscriptionPlan.MAX]: 'danger',
}

/**
 * The UTC timestamp when bot-level data tracking started.
 * Data before this point cannot be attributed to individual bots.
 */
export const BOT_TRACKING_START_DATE = '2026-03-19T05:00:00Z'
