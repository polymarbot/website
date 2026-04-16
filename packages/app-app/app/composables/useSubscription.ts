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
      subscription.value = await request.get<SubscriptionStatus>('/api/subscription', {
        memoryCache: { ttl: 60 * 60 * 1000 },
      })
      return subscription.value
    } catch (e) {
      error.value = e as Error
      return null
    } finally {
      loading.value = false
    }
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
   * Check if subscription is lifetime (non-FREE plan with no expiration)
   */
  const isLifetime = computed(() => {
    if (!subscription.value) return false
    if (currentPlan.value === SubscriptionPlan.FREE) return false
    return subscription.value.expiresAt === null
  })

  // ============================================================================
  // Stats Access Methods
  // ============================================================================

  /**
   * Get effective stats access level (considers expiration)
   */
  const effectiveStatsAccess = computed<StatsAccessType>(() => {
    if (!subscription.value) return StatsAccess.NONE
    const expiresAt = subscription.value.expiresAt
      ? new Date(subscription.value.expiresAt)
      : null
    return getPlanLimits(subscription.value.plan, expiresAt).statsAccess
  })

  /**
   * Get allowed date presets for current subscription
   */
  const allowedStatsPresets = computed<StatsDatePresetType[]>(() => {
    return STATS_ACCESS_PERMISSIONS[effectiveStatsAccess.value].datePresets
  })

  /**
   * Get default date preset for current subscription
   * - none/full: WEEK
   * - partial: QUARTER (only option available)
   */
  const defaultStatsPreset = computed<StatsDatePresetType>(() => {
    if (effectiveStatsAccess.value === StatsAccess.PARTIAL) {
      return StatsDatePreset.QUARTER
    }
    return StatsDatePreset.WEEK
  })

  /**
   * Check if user has any stats access
   */
  const hasStatsAccess = computed(() => {
    return effectiveStatsAccess.value !== StatsAccess.NONE
  })

  /**
   * Check if user has bot filter access
   */
  const hasBotFilterAccess = computed(() => {
    return STATS_ACCESS_PERMISSIONS[effectiveStatsAccess.value].botFilter
  })

  return {
    // State
    subscription: readonly(subscription),
    loading: readonly(loading),
    error: readonly(error),

    // Computed
    isExpired,
    isLifetime,
    currentPlan,
    limits,
    usage,

    // Stats access computed
    allowedStatsPresets,
    defaultStatsPreset,
    hasStatsAccess,
    hasBotFilterAccess,

    // Methods
    fetchSubscription,
  }
}
