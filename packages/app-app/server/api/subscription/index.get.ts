/**
 * GET /api/subscription
 *
 * Get current user's subscription status and resource usage.
 *
 * @returns {SubscriptionStatus} Subscription info including:
 *   - plan: Current subscription plan (FREE, PRO, PLUS, MAX)
 *   - expiresAt: Expiration date or null if never expires
 *   - isExpired: Whether the subscription has expired
 *   - limits: Resource limits for the current plan
 *   - usage: Current resource usage counts
 */
export default defineWrappedResponseHandler(async event => {
  const { user } = await requireAuthSession(event)

  const [ subscription, usage ] = await Promise.all([
    getUserSubscription(user.id),
    getUserResourceCounts(user.id),
  ])

  const isExpired = isSubscriptionExpired(subscription.plan, subscription.expiresAt)
  const limits = getPlanLimits(subscription.plan, subscription.expiresAt)

  return {
    plan: subscription.plan,
    expiresAt: subscription.expiresAt,
    isExpired,
    limits,
    usage,
  }
})
