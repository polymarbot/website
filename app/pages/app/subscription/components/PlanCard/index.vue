<script setup lang="ts">
const props = defineProps<{
  planId: SubscriptionPlanType
  plan: PlanDefinition
  currentPlan: SubscriptionPlanType
  billingCycle: BillingCycleType
}>()

const emit = defineEmits<{
  select: [planId: SubscriptionPlanType, billingCycle: BillingCycleType]
}>()

const T = useTranslations('pages.app.subscription.components.PlanCard')

const isCurrent = computed(() => props.planId === props.currentPlan)
const isYearly = computed(() => props.billingCycle === BillingCycle.YEARLY)
const isPaidPlan = computed(() => props.plan.price > 0)
const isFree = computed(() => props.planId === SubscriptionPlan.FREE)

const currentIndex = computed(() => getPlanIndex(props.currentPlan))
const planIndex = computed(() => getPlanIndex(props.planId))

const isUpgrade = computed(() => planIndex.value > currentIndex.value)
const isDowngrade = computed(() => planIndex.value < currentIndex.value)

const buttonLabel = computed(() => {
  if (isCurrent.value) return T('renew')
  if (isUpgrade.value) return T('upgrade')
  if (isDowngrade.value) return T('downgrade')
  return T('upgrade')
})

const buttonSeverity = computed(() => {
  if (isCurrent.value) return 'info'
  if (isUpgrade.value) return 'primary'
  return 'secondary'
})

// Pricing calculations
const displayPrice = computed(() => {
  if (isYearly.value) {
    return props.plan.yearlyPrice
  }
  return props.plan.price
})

const monthlyEquivalent = computed(() => {
  if (!isYearly.value || !isPaidPlan.value) return null
  return getMonthlyEquivalent(props.plan.yearlyPrice)
})

const yearlySavings = computed(() => {
  if (!isYearly.value || !isPaidPlan.value) return null
  return getYearlySavings(props.plan)
})

const originalYearlyPrice = computed(() => {
  if (!isYearly.value || !isPaidPlan.value) return null
  return props.plan.price * 12
})

function formatLimit (value: number | null): string {
  if (value === null) return T('unlimited')
  return value.toString()
}

function isUnlimited (value: number | null): boolean {
  return value === null
}

// Get stats access label based on plan
function getStatsAccessLabel (): string {
  const config = STATS_ACCESS_BY_PLAN[props.planId]
  if (config.hasFullAccess) {
    return T('statsAccess.full')
  }
  if (config.allowedPresets.length === 0) {
    return T('statsAccess.none')
  }
  return T('statsAccess.limited')
}

function hasFullStatsAccess (): boolean {
  return STATS_ACCESS_BY_PLAN[props.planId].hasFullAccess
}
</script>

<template>
  <div
    class="flex flex-col rounded-xl border p-5 transition-all"
    :class="
      isCurrent
        ? 'border-primary bg-primary/5'
        : `
          border-surface
          hover:border-primary/50
        `
    "
  >
    <!-- Header -->
    <div class="mb-4">
      <h3 class="text-xl font-semibold text-color">
        {{ plan.name }}
      </h3>
      <!-- Price display -->
      <div class="mt-2">
        <!-- Current price -->
        <div class="flex items-baseline gap-1">
          <span
            class="text-3xl font-bold"
            :class="isCurrent ? 'text-info' : 'text-color'"
          >
            {{ formatCurrency(displayPrice) }}
          </span>
          <span
            v-if="isPaidPlan"
            class="text-muted-color"
          >
            {{ isYearly ? T('perYear') : T('perMonth') }}
          </span>
        </div>
        <!-- Yearly savings info -->
        <div
          v-if="isYearly && isPaidPlan"
          class="mt-1.5 space-y-0.5 text-xs"
        >
          <!-- Original price (strikethrough) -->
          <div class="text-muted-color/70 line-through">
            {{ T('pricing.originalPrice', { price: formatCurrency(originalYearlyPrice ?? 0) }) }}
          </div>
          <!-- Monthly equivalent + savings -->
          <div class="text-muted-color">
            {{ T('pricing.monthlyEquivalent', { price: formatCurrency(monthlyEquivalent ?? 0) }) }}
            ·
            <span class="font-medium text-success">
              {{ T('pricing.save', { amount: formatCurrency(yearlySavings ?? 0) }) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Features -->
    <ul class="mb-6 flex-1 space-y-3">
      <li class="flex items-center gap-2 text-sm">
        <i class="pi pi-wallet text-primary" />
        <span class="text-muted-color">
          {{ T('limits.wallets') }}:
        </span>
        <span
          class="font-medium"
          :class="isUnlimited(plan.limits.wallets) ? 'text-success' : `
            text-color
          `"
        >
          {{ formatLimit(plan.limits.wallets) }}
        </span>
      </li>
      <li class="flex items-center gap-2 text-sm">
        <i class="pi pi-book text-primary" />
        <span class="text-muted-color">
          {{ T('limits.strategies') }}:
        </span>
        <span
          class="font-medium"
          :class="isUnlimited(plan.limits.strategies) ? 'text-success' : `
            text-color
          `"
        >
          {{ formatLimit(plan.limits.strategies) }}
        </span>
      </li>
      <li class="flex items-center gap-2 text-sm">
        <i class="pi pi-android text-primary" />
        <span class="text-muted-color">
          {{ T('limits.bots') }}:
        </span>
        <span
          class="font-medium"
          :class="isUnlimited(plan.limits.bots) ? 'text-success' : 'text-color'"
        >
          {{ formatLimit(plan.limits.bots) }}
        </span>
      </li>
      <li class="flex items-center gap-2 text-sm">
        <i class="pi pi-dollar text-primary" />
        <span class="text-muted-color">
          {{ T('limits.maxStrategyAmount') }}:
        </span>
        <span
          class="font-medium"
          :class="isUnlimited(plan.limits.maxStrategyAmount) ? 'text-success' : `
            text-color
          `"
        >
          {{ plan.limits.maxStrategyAmount ? formatCurrency(plan.limits.maxStrategyAmount) : T('unlimited') }}
        </span>
      </li>
      <li class="flex items-center gap-2 text-sm">
        <i class="pi pi-chart-bar text-primary" />
        <span class="text-muted-color">
          {{ T('limits.statsAccess') }}:
        </span>
        <span
          class="font-medium"
          :class="hasFullStatsAccess() ? 'text-success' : 'text-color'"
        >
          {{ getStatsAccessLabel() }}
        </span>
      </li>
    </ul>

    <!-- Action button (hidden for FREE plan) -->
    <Button
      v-if="!isFree"
      :label="buttonLabel"
      :severity="buttonSeverity"
      :outlined="isDowngrade"
      class="w-full"
      @click="emit('select', planId, billingCycle)"
    />
  </div>
</template>
