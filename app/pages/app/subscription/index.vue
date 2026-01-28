<script setup lang="ts">
import PlanCard from './components/PlanCard/index.vue'
import SubscriptionActionModal from './components/SubscriptionActionModal/index.vue'
import UsageProgress from './components/UsageProgress.vue'

definePageMeta({
  layout: 'app',
  title: 'pages.app.subscription.name',
})

const T = useTranslations('pages.app.subscription')
const toast = useToast()
const { formatDate } = useDate()
const { isMobile } = useDevice()

const {
  subscription,
  currentPlan,
  limits,
  usage,
  isExpired,
  fetchSubscription,
} = useSubscription()

const ready = ref(false)

onMounted(async () => {
  await fetchSubscription()
  ready.value = true
})

// Billing cycle toggle
const billingCycle = ref<BillingCycleType>(BillingCycle.MONTHLY)

const billingCycleOptions = computed(() => [
  { label: T(`billingCycle.${BillingCycle.MONTHLY}`), value: BillingCycle.MONTHLY },
  {
    label: `${T(`billingCycle.${BillingCycle.YEARLY}`)} (${T('savePercent', { percent: yearlyDiscountPercent.value })})`,
    value: BillingCycle.YEARLY,
  },
])

// Calculate discount percent (use PRO plan as reference)
const yearlyDiscountPercent = computed(() => {
  return getYearlyDiscountPercent(SUBSCRIPTION_PLANS.PRO)
})

// Format expiration date
const expiresAtText = computed(() => {
  if (!subscription.value) return ''
  if (!subscription.value.expiresAt) return T('neverExpires')
  return formatDate(subscription.value.expiresAt)
})

// Plan list for rendering
const planList = computed(() => {
  return Object.entries(SUBSCRIPTION_PLANS).map(([ id, plan ]) => ({
    id: id as SubscriptionPlanType,
    plan,
  }))
})

// Calculate remaining days of current subscription
const remainingDays = computed(() => {
  if (!subscription.value?.expiresAt) return 0
  if (isExpired.value) return 0

  const expiresAt = new Date(subscription.value.expiresAt)
  const now = new Date()
  const diffMs = expiresAt.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
})

// Check if subscription is lifetime (non-FREE plan with no expiration)
const isLifetime = computed(() => {
  if (!subscription.value) return false
  if (currentPlan.value === SubscriptionPlan.FREE) return false
  return subscription.value.expiresAt === null
})

// Modal state
const modalVisible = ref(false)
const selectedPlanId = ref<SubscriptionPlanType>(SubscriptionPlan.FREE)
const selectedBillingCycle = ref<BillingCycleType>(BillingCycle.MONTHLY)

// Handle plan selection - open modal
function handlePlanSelect (planId: SubscriptionPlanType, cycle: BillingCycleType) {
  selectedPlanId.value = planId
  selectedBillingCycle.value = cycle
  modalVisible.value = true
}

// Payment loading state
const isProcessingPayment = ref(false)

// Handle modal confirm
async function handleModalConfirm (result: SubscriptionActionResult) {
  // For downgrade (no payment needed), handle differently
  if (result.action === 'downgrade' || result.amountToPay === 0) {
    modalVisible.value = false
    toast.info(T('payment.noPaymentNeeded'), T('payment.title'))
    return
  }

  // Create charge and redirect to Coinbase payment page
  isProcessingPayment.value = true

  try {
    const response = await $fetch('/api/subscription/create-charge', {
      method: 'POST',
      body: {
        plan: result.targetPlan,
        billingCycle: result.billingCycle,
      },
    })

    // Redirect to Coinbase hosted payment page
    if (response.hostedUrl) {
      window.location.href = response.hostedUrl
    }
  } catch (error) {
    console.error('Failed to create charge:', error)
    toast.error(T('payment.createChargeFailed'))
    isProcessingPayment.value = false
    modalVisible.value = false
  }
}
</script>

<template>
  <PageCard :ready="ready">
    <template #title>
      <div class="flex items-center justify-between">
        <span>{{ T('name') }}</span>
        <Button
          severity="secondary"
          outlined
          icon="pi pi-history"
          :size="isMobile ? 'small' : undefined"
          href="/app/subscription/payments"
        >
          {{ T('paymentHistory') }}
        </Button>
      </div>
    </template>

    <div class="flex flex-col gap-8">
      <!-- Expired warning -->
      <Message
        v-if="isExpired"
        severity="warn"
      >
        <template #icon>
          <i class="pi pi-exclamation-triangle" />
        </template>
        <div>
          <div class="font-semibold">
            {{ T('expiredWarning.title') }}
          </div>
          <div class="mt-1 text-sm opacity-90">
            {{ T('expiredWarning.description') }}
          </div>
        </div>
      </Message>

      <!-- Current plan and usage -->
      <div
        class="
          grid gap-4
          sm:grid-cols-2
          lg:grid-cols-3
          xl:grid-cols-4
        "
      >
        <div class="rounded-xl border border-surface bg-surface p-5">
          <!-- Header: Current plan info -->
          <div class="mb-4 flex items-center justify-between gap-2">
            <span class="font-semibold text-muted-color">
              {{ T('currentPlan') }}
            </span>
            <Tag
              v-if="isLifetime"
              :value="T('neverExpires')"
              severity="success"
              class="text-xs"
            />
            <Tag
              v-else-if="isExpired"
              :value="T('expired')"
              severity="danger"
              class="text-xs"
            />
          </div>
          <div class="mb-5">
            <span class="text-4xl font-bold text-color">
              {{ SUBSCRIPTION_PLANS[currentPlan].name }}
            </span>
            <div
              v-if="subscription?.expiresAt"
              class="mt-1 text-xs text-muted-color"
            >
              {{ T('expiresAt') }}:
              <span :class="isExpired ? 'text-danger' : ''">
                {{ expiresAtText }}
              </span>
            </div>
          </div>

          <!-- Resource usage bars -->
          <div class="flex flex-col gap-4">
            <UsageProgress
              :label="T('usage.wallets')"
              icon="pi pi-wallet"
              :used="usage.wallets"
              :limit="limits.wallets"
            />
            <UsageProgress
              :label="T('usage.strategies')"
              icon="pi pi-book"
              :used="usage.strategies"
              :limit="limits.strategies"
            />
            <UsageProgress
              :label="T('usage.bots')"
              icon="pi pi-android"
              :used="usage.bots"
              :limit="limits.bots"
            />
          </div>
        </div>
      </div>

      <!-- Available plans (hidden for lifetime subscriptions) -->
      <div v-if="!isLifetime">
        <div class="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-color">
              {{ T('plans.title') }}
            </h3>
            <p class="mt-1 text-sm text-muted-color">
              {{ T('plans.description') }}
            </p>
          </div>
          <!-- Billing cycle toggle -->
          <SelectButton
            v-model="billingCycle"
            :options="billingCycleOptions"
          />
        </div>
        <TransitionGroup
          name="plan-cards"
          tag="div"
          class="
            grid gap-4
            sm:grid-cols-2
            lg:grid-cols-3
            xl:grid-cols-4
          "
        >
          <PlanCard
            v-for="({ id, plan }, index) in planList"
            :key="`${id}-${billingCycle}`"
            :planId="id"
            :plan="plan"
            :currentPlan="currentPlan"
            :billingCycle="billingCycle"
            :style="{ '--delay': `${index * 50}ms` }"
            @select="handlePlanSelect"
          />
        </TransitionGroup>
      </div>
    </div>

    <!-- Subscription action modal -->
    <SubscriptionActionModal
      v-model:visible="modalVisible"
      :loading="isProcessingPayment"
      :targetPlanId="selectedPlanId"
      :currentPlanId="currentPlan"
      :billingCycle="selectedBillingCycle"
      :remainingDays="remainingDays"
      @confirm="handleModalConfirm"
    />
  </PageCard>
</template>

<style scoped>
.plan-cards-enter-active {
  transition: all 0.3s ease-out;
  transition-delay: var(--delay, 0ms);
}

.plan-cards-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

/* Hide leaving elements immediately */
.plan-cards-leave-active {
  display: none;
}
</style>
