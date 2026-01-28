/**
 * Subscription status returned from API
 */
export interface SubscriptionStatus {
  plan: SubscriptionPlanType
  expiresAt: string | null
  isExpired: boolean
  limits: PlanLimits
  usage: {
    wallets: number
    strategies: number
    bots: number
  }
}

/**
 * Plan definition with ID
 */
export interface PlanWithId extends PlanDefinition {
  id: SubscriptionPlanType
}

/**
 * Resource type for quota checking
 */
export type ResourceType = 'wallets' | 'strategies' | 'bots'

/**
 * Subscription management composable
 *
 * Provides subscription status, limits, and usage information.
 */
export function useSubscription () {
  const request = useRequest()

  const subscription = ref<SubscriptionStatus | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Fetch current subscription status
   */
  async function fetchSubscription (): Promise<SubscriptionStatus | null> {
    loading.value = true
    error.value = null

    try {
      subscription.value = await request.get<SubscriptionStatus>('/api/subscription')
      return subscription.value
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Check if user can create more of a resource type
   */
  function canCreate (resourceType: ResourceType): boolean {
    if (!subscription.value) return false
    return subscription.value.usage[resourceType] < subscription.value.limits[resourceType]
  }

  /**
   * Check if strategy amount is within limit
   */
  function isAmountAllowed (amount: number): boolean {
    if (!subscription.value) return false
    const limit = subscription.value.limits.maxStrategyAmount
    return limit === null || amount <= limit
  }

  /**
   * Get remaining quota for a resource type
   */
  function getRemainingQuota (resourceType: ResourceType): number {
    if (!subscription.value) return 0
    return Math.max(0, subscription.value.limits[resourceType] - subscription.value.usage[resourceType])
  }

  /**
   * Get usage percentage for a resource type
   */
  function getUsagePercentage (resourceType: ResourceType): number {
    if (!subscription.value) return 0
    const usage = subscription.value.usage[resourceType]
    const limit = subscription.value.limits[resourceType]
    return Math.min(100, Math.round((usage / limit) * 100))
  }

  /**
   * Check if current plan is the specified plan
   */
  function isPlan (plan: SubscriptionPlanType): boolean {
    if (!subscription.value) return false
    return subscription.value.plan === plan
  }

  /**
   * Check if subscription is expired
   */
  const isExpired = computed(() => subscription.value?.isExpired ?? false)

  /**
   * Get current plan name
   */
  const currentPlan = computed(() => subscription.value?.plan ?? SubscriptionPlan.FREE)

  /**
   * Get current plan limits
   */
  const limits = computed(() => subscription.value?.limits ?? SUBSCRIPTION_PLANS.FREE.limits)

  /**
   * Get current usage
   */
  const usage = computed(() => subscription.value?.usage ?? { wallets: 0, strategies: 0, bots: 0 })

  /**
   * Get all available plans (static)
   */
  const plans = computed(() => SUBSCRIPTION_PLANS)

  // ============================================================================
  // Stats Access Methods
  // ============================================================================

  /**
   * Get effective plan for stats access (considers expiration)
   */
  const effectiveStatsAccessPlan = computed<SubscriptionPlanType>(() => {
    if (!subscription.value) return SubscriptionPlan.FREE
    const expiresAt = subscription.value.expiresAt
      ? new Date(subscription.value.expiresAt)
      : null
    return getEffectiveStatsAccessPlan(subscription.value.plan, expiresAt)
  })

  /**
   * Get allowed date presets for current subscription
   */
  const allowedStatsPresets = computed<StatsDatePresetType[]>(() => {
    return STATS_ACCESS_BY_PLAN[effectiveStatsAccessPlan.value].allowedPresets
  })

  /**
   * Get default date preset for current subscription
   * - FREE/PLUS/MAX: WEEK
   * - PRO: QUARTER (only option available)
   */
  const defaultStatsPreset = computed<StatsDatePresetType>(() => {
    return getDefaultStatsPreset(effectiveStatsAccessPlan.value)
  })

  /**
   * Check if user has any stats access (not FREE)
   */
  const hasStatsAccess = computed(() => {
    return effectiveStatsAccessPlan.value !== SubscriptionPlan.FREE
  })

  return {
    // State
    subscription: readonly(subscription),
    loading: readonly(loading),
    error: readonly(error),

    // Computed
    isExpired,
    currentPlan,
    limits,
    usage,
    plans,

    // Stats access computed
    allowedStatsPresets,
    defaultStatsPreset,
    hasStatsAccess,

    // Methods
    fetchSubscription,
    canCreate,
    isAmountAllowed,
    getRemainingQuota,
    getUsagePercentage,
    isPlan,
  }
}
