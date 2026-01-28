<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  loading?: boolean
  targetPlanId: SubscriptionPlanType
  currentPlanId: SubscriptionPlanType
  billingCycle: BillingCycleType
  remainingDays: number
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'confirm': [result: SubscriptionActionResult]
}>()

const T = useTranslations('pages.app.subscription.components.SubscriptionActionModal')
const TPage = useTranslations('pages.app.subscription')
const { formatDate } = useDate()

const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const targetPlan = computed(() => SUBSCRIPTION_PLANS[props.targetPlanId])
const currentPlan = computed(() => SUBSCRIPTION_PLANS[props.currentPlanId])

const action = computed<SubscriptionAction>(() =>
  getSubscriptionAction(props.currentPlanId, props.targetPlanId),
)

const actionResult = computed<SubscriptionActionResult>(() => {
  const currentAction = action.value
  if (currentAction === 'renew') {
    return calculateRenewal(
      props.currentPlanId,
      props.remainingDays,
      props.billingCycle,
    )
  }
  if (currentAction === 'upgrade') {
    return calculateUpgrade(
      props.currentPlanId,
      props.targetPlanId,
      props.remainingDays,
      props.billingCycle,
    )
  }
  return calculateDowngrade(
    props.currentPlanId,
    props.targetPlanId,
    props.remainingDays,
    props.billingCycle,
  )
})

const modalTitle = computed(() => {
  const currentAction = action.value
  if (currentAction === 'renew') return T('renew.title')
  if (currentAction === 'upgrade') return T('upgrade.title')
  return T('downgrade.title')
})

const confirmButtonText = computed(() => {
  if (actionResult.value.amountToPay > 0) {
    return T('payAndConfirm', { amount: formatCurrency(actionResult.value.amountToPay) })
  }
  return T('confirm')
})

// Use parent page's translation for billingCycle to avoid duplication
const periodLabel = computed(() => TPage(`billingCycle.${props.billingCycle}`))

const periodDays = computed(() => getPeriodDays(props.billingCycle))

// Calculate new expiration date based on newDays
const newExpirationDate = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() + actionResult.value.newDays)
  return formatDate(date)
})

function formatDays (days: number): string {
  if (days >= 365) {
    const years = Math.floor(days / 365)
    const remainingDays = days % 365
    if (remainingDays === 0) {
      return T('years', { count: years })
    }
    return T('yearsAndDays', { years, days: remainingDays })
  }
  return T('days', { count: days })
}

function onConfirm () {
  emit('confirm', actionResult.value)
  // Don't close the modal here - let parent control it after payment processing
}
</script>

<template>
  <Modal
    v-model:visible="visible"
    :title="modalTitle"
    :confirmText="confirmButtonText"
    :loading="loading"
    showCancel
    @confirm="onConfirm"
  >
    <div class="flex flex-col gap-4">
      <!-- Plan change info -->
      <div class="flex items-center justify-center gap-3 text-lg">
        <span class="font-semibold text-color">
          {{ currentPlan.name }}
        </span>
        <i class="pi pi-arrow-right text-muted-color" />
        <span class="font-semibold text-primary">
          {{ targetPlan.name }}
        </span>
        <Tag
          :value="periodLabel"
          severity="info"
          class="text-xs"
        />
      </div>

      <!-- Renew info -->
      <template v-if="action === 'renew'">
        <Message severity="info">
          {{ T('renew.description', { days: periodDays }) }}
        </Message>
        <div class="rounded-lg p-4 bg-emphasis">
          <div class="flex items-center justify-between">
            <span class="text-muted-color">
              {{ T('currentRemaining') }}
            </span>
            <span class="font-medium text-color">
              {{ formatDays(remainingDays) }}
            </span>
          </div>
          <Divider />
          <div class="flex items-center justify-between">
            <span class="text-muted-color">
              {{ T('addDays') }}
            </span>
            <span class="font-medium text-success">
              +{{ formatDays(periodDays) }}
            </span>
          </div>
          <Divider />
          <div class="flex items-center justify-between">
            <span class="font-semibold text-color">
              {{ T('newExpiration') }}
            </span>
            <div class="text-right">
              <div class="font-bold text-primary">
                {{ formatDays(actionResult.newDays) }}
              </div>
              <div class="text-xs text-muted-color">
                {{ T('expiresAt', { date: newExpirationDate }) }}
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Upgrade info -->
      <template v-else-if="action === 'upgrade'">
        <Message
          v-if="actionResult.isFullyCovered"
          severity="success"
        >
          {{ T('upgrade.fullyCovered') }}
        </Message>
        <Message
          v-else
          severity="info"
        >
          {{ T('upgrade.description') }}
        </Message>
        <div class="rounded-lg p-4 bg-emphasis">
          <div class="flex items-center justify-between">
            <span class="text-muted-color">
              {{ T('currentRemaining') }}
            </span>
            <span class="font-medium text-color">
              {{ formatDays(remainingDays) }}
            </span>
          </div>
          <Divider />
          <div class="flex items-center justify-between">
            <span class="text-muted-color">
              {{ T('convertedDays') }}
            </span>
            <div class="text-right">
              <span class="font-medium text-info">
                {{ formatDays(actionResult.convertedDays) }}
              </span>
              <div class="text-xs text-muted-color">
                {{ T('creditAmount', { amount: formatCurrency(actionResult.creditAmount) }) }}
              </div>
            </div>
          </div>
          <template v-if="!actionResult.isFullyCovered">
            <Divider />
            <div class="flex items-center justify-between">
              <span class="text-muted-color">
                {{ T('periodDays') }}
              </span>
              <span class="font-medium text-color">
                {{ formatDays(periodDays) }}
              </span>
            </div>
          </template>
          <Divider />
          <div class="flex items-center justify-between">
            <span class="font-semibold text-color">
              {{ T('newExpiration') }}
            </span>
            <div class="text-right">
              <div class="font-bold text-primary">
                {{ formatDays(actionResult.newDays) }}
              </div>
              <div class="text-xs text-muted-color">
                {{ T('expiresAt', { date: newExpirationDate }) }}
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Downgrade info -->
      <template v-else-if="action === 'downgrade'">
        <Message severity="warn">
          {{ T('downgrade.description') }}
        </Message>
        <div class="rounded-lg p-4 bg-emphasis">
          <div class="flex items-center justify-between">
            <span class="text-muted-color">
              {{ T('currentRemaining') }}
            </span>
            <span class="font-medium text-color">
              {{ formatDays(remainingDays) }}
            </span>
          </div>
          <Divider />
          <div class="flex items-center justify-between">
            <span class="text-muted-color">
              {{ T('convertedDays') }}
            </span>
            <span class="font-medium text-success">
              {{ formatDays(actionResult.convertedDays) }}
            </span>
          </div>
          <Divider />
          <div class="flex items-center justify-between">
            <span class="font-semibold text-color">
              {{ T('newExpiration') }}
            </span>
            <div class="text-right">
              <div class="font-bold text-primary">
                {{ formatDays(actionResult.newDays) }}
              </div>
              <div class="text-xs text-muted-color">
                {{ T('expiresAt', { date: newExpirationDate }) }}
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Payment summary -->
      <div
        v-if="actionResult.amountToPay > 0"
        class="
          flex items-center justify-between rounded-lg border border-primary
          bg-primary/5 p-4
        "
      >
        <span class="font-semibold text-color">
          {{ T('totalAmount') }}
        </span>
        <span class="text-2xl font-bold text-primary">
          {{ formatCurrency(actionResult.amountToPay) }}
        </span>
      </div>
    </div>
  </Modal>
</template>
