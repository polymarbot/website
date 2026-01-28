/**
 * Subscription Limit Validation Utilities
 *
 * Validates resource creation against user's subscription plan limits.
 * Uses request-scoped caching to avoid redundant database queries.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/** User subscription with basic info */
export interface UserSubscriptionInfo {
  plan: SubscriptionPlanType
  expiresAt: Date | null
}

/** User resource usage counts */
export interface UserResourceCounts {
  wallets: number
  strategies: number
  bots: number
}

/** Request-scoped subscription context for caching */
export interface SubscriptionContext {
  userId: string
  subscription?: UserSubscriptionInfo
  counts?: UserResourceCounts
  limits?: ReturnType<typeof getPlanLimits>
}

// ============================================================================
// Context Factory
// ============================================================================

/**
 * Create a new subscription context for request-scoped caching
 */
export function createSubscriptionContext (userId: string): SubscriptionContext {
  return { userId }
}

// ============================================================================
// Data Fetching (with caching)
// ============================================================================

/**
 * Get user's effective subscription (defaults to FREE if none exists)
 */
export async function getUserSubscription (
  userId: string,
  ctx?: SubscriptionContext,
): Promise<UserSubscriptionInfo> {
  if (ctx?.subscription) return ctx.subscription

  const subscription = await db.userSubscription.findUnique({
    where: { userId },
    select: { plan: true, expiresAt: true },
  })

  const result: UserSubscriptionInfo = subscription
    ? { plan: subscription.plan as SubscriptionPlanType, expiresAt: subscription.expiresAt }
    : { plan: SubscriptionPlan.FREE, expiresAt: null }

  if (ctx) ctx.subscription = result
  return result
}

/**
 * Get user's resource usage counts
 */
export async function getUserResourceCounts (
  userId: string,
  ctx?: SubscriptionContext,
): Promise<UserResourceCounts> {
  if (ctx?.counts) return ctx.counts

  const [ walletCount, strategyCount, botCount ] = await Promise.all([
    db.wallet.count({ where: { ownerId: userId, deleted: false }}),
    db.strategy.count({ where: { ownerId: userId }}),
    db.bot.count({ where: { wallet: { ownerId: userId, deleted: false }}}),
  ])

  const result: UserResourceCounts = {
    wallets: walletCount,
    strategies: strategyCount,
    bots: botCount,
  }

  if (ctx) ctx.counts = result
  return result
}

/**
 * Get plan limits for the user
 */
export async function getUserLimits (
  userId: string,
  ctx?: SubscriptionContext,
): Promise<ReturnType<typeof getPlanLimits>> {
  if (ctx?.limits) return ctx.limits

  const subscription = await getUserSubscription(userId, ctx)
  const limits = getPlanLimits(subscription.plan, subscription.expiresAt)

  if (ctx) ctx.limits = limits
  return limits
}

// ============================================================================
// Validation Functions (sorted by resource type)
// ============================================================================

/**
 * Validate wallet count limit
 */
export async function validateWalletCount (
  userId: string,
  additionalCount: number = 1,
  ctx?: SubscriptionContext,
): Promise<void> {
  const [ subscription, counts, limits ] = await Promise.all([
    getUserSubscription(userId, ctx),
    getUserResourceCounts(userId, ctx),
    getUserLimits(userId, ctx),
  ])

  if (counts.wallets + additionalCount > limits.wallets) {
    throwApiError(403, ERROR_CODES.SUBSCRIPTION_WALLET_LIMIT_EXCEEDED, {
      current: counts.wallets,
      limit: limits.wallets,
      plan: subscription.plan,
    })
  }
}

/**
 * Validate strategy count limit
 */
export async function validateStrategyCount (
  userId: string,
  additionalCount: number = 1,
  ctx?: SubscriptionContext,
): Promise<void> {
  const [ subscription, counts, limits ] = await Promise.all([
    getUserSubscription(userId, ctx),
    getUserResourceCounts(userId, ctx),
    getUserLimits(userId, ctx),
  ])

  if (counts.strategies + additionalCount > limits.strategies) {
    throwApiError(403, ERROR_CODES.SUBSCRIPTION_STRATEGY_LIMIT_EXCEEDED, {
      current: counts.strategies,
      limit: limits.strategies,
      plan: subscription.plan,
    })
  }
}

/**
 * Validate strategy amount limit
 */
export async function validateStrategyAmount (
  userId: string,
  strategyAmount: number,
  ctx?: SubscriptionContext,
): Promise<void> {
  const [ subscription, limits ] = await Promise.all([
    getUserSubscription(userId, ctx),
    getUserLimits(userId, ctx),
  ])

  if (limits.maxStrategyAmount !== null && strategyAmount > limits.maxStrategyAmount) {
    throwApiError(403, ERROR_CODES.SUBSCRIPTION_STRATEGY_AMOUNT_EXCEEDED, {
      amount: strategyAmount,
      limit: limits.maxStrategyAmount,
      plan: subscription.plan,
    })
  }
}

/**
 * Validate bot count limit
 */
export async function validateBotCount (
  userId: string,
  additionalCount: number = 1,
  ctx?: SubscriptionContext,
): Promise<void> {
  const [ subscription, counts, limits ] = await Promise.all([
    getUserSubscription(userId, ctx),
    getUserResourceCounts(userId, ctx),
    getUserLimits(userId, ctx),
  ])

  if (counts.bots + additionalCount > limits.bots) {
    throwApiError(403, ERROR_CODES.SUBSCRIPTION_BOT_LIMIT_EXCEEDED, {
      current: counts.bots,
      limit: limits.bots,
      plan: subscription.plan,
    })
  }
}
