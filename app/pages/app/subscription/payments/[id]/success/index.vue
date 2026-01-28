<script setup lang="ts">
definePageMeta({
  layout: 'transparent',
  title: 'pages.app.subscription.payments._id_.success.name',
})

const T = useTranslations('pages.app.subscription.payments._id_.success')
const route = useRoute()
const router = useRouter()
const request = useRequest()
const { fetchSubscription } = useSubscription()

const paymentId = computed(() => route.params.id as string)

const payment = ref<SubscriptionPaymentItem | null>(null)
const isReady = ref(false)
const isExpired = computed(() => {
  if (!payment.value) return false
  return payment.value.status === PaymentStatus.PENDING
    && new Date(payment.value.chargeExpiresAt) < new Date()
})
const isPending = computed(() => payment.value?.status === PaymentStatus.PENDING && !isExpired.value)
const isConfirmed = computed(() => payment.value?.status === PaymentStatus.CONFIRMED)
const isFailed = computed(() => payment.value?.status === PaymentStatus.FAILED)

const planName = computed(() => {
  if (!payment.value) return ''
  return SUBSCRIPTION_PLANS[payment.value.plan]?.name ?? payment.value.plan
})

let isPolling = true

async function loadPayment () {
  try {
    payment.value = await request.get<SubscriptionPaymentItem>(
      `/api/subscription/payments/${paymentId.value}`,
    )
  } finally {
    isReady.value = true
  }
}

async function startPolling () {
  while (isPolling && isPending.value) {
    await sleep(5000)
    if (!isPolling) break
    await loadPayment()
  }

  if (isConfirmed.value) {
    fetchSubscription()
  }
}

onMounted(async () => {
  await loadPayment()
  if (isPending.value) {
    startPolling()
  }
})

onUnmounted(() => {
  isPolling = false
})

function goToSubscription () {
  router.push('/app/subscription')
}

function goToPaymentPage () {
  if (payment.value?.hostedUrl) {
    window.location.href = payment.value.hostedUrl
  }
}
</script>

<template>
  <div class="flex h-[100svh] items-center justify-center p-4">
    <div class="flex flex-col items-center gap-6 text-center">
      <!-- Loading state -->
      <template v-if="!isReady">
        <div
          class="
            flex size-24 items-center justify-center rounded-full bg-emphasis
          "
        >
          <i class="pi pi-spin pi-spinner text-6xl text-muted-color" />
        </div>
        <div>
          <h1 class="mb-2 text-2xl font-bold text-color">
            {{ T('loading.title') }}
          </h1>
          <p class="text-muted-color">
            {{ T('loading.description') }}
          </p>
        </div>
      </template>

      <!-- Pending state -->
      <template v-else-if="isPending">
        <div
          class="
            flex size-24 items-center justify-center rounded-full bg-info/10
          "
        >
          <i class="pi pi-spin pi-spinner text-6xl text-info" />
        </div>
        <div>
          <h1 class="mb-2 text-2xl font-bold text-color">
            {{ T('pending.title') }}
          </h1>
          <p class="text-muted-color">
            {{ T('pending.description') }}
          </p>
        </div>
        <Message
          severity="info"
          class="max-w-lg text-left"
        >
          <template #icon>
            <i class="pi pi-info-circle" />
          </template>
          {{ T('pending.note') }}
        </Message>
        <div class="flex flex-wrap justify-center gap-3">
          <Button
            :label="T('backToSubscription')"
            icon="pi pi-arrow-left"
            severity="secondary"
            outlined
            @click="goToSubscription"
          />
          <Button
            :label="T('pending.continuePayment')"
            icon="pi pi-external-link"
            @click="goToPaymentPage"
          />
        </div>
      </template>

      <!-- Confirmed state -->
      <template v-else-if="isConfirmed">
        <div
          class="
            flex size-24 items-center justify-center rounded-full bg-success/10
          "
        >
          <i class="pi pi-check-circle text-6xl text-success" />
        </div>
        <div>
          <h1 class="mb-2 text-2xl font-bold text-color">
            {{ T('confirmed.title') }}
          </h1>
          <p class="text-muted-color">
            {{ T('confirmed.description', { plan: planName }) }}
          </p>
        </div>
        <Button
          :label="T('backToSubscription')"
          icon="pi pi-arrow-left"
          @click="goToSubscription"
        />
      </template>

      <!-- Failed state -->
      <template v-else-if="isFailed">
        <div
          class="
            flex size-24 items-center justify-center rounded-full bg-danger/10
          "
        >
          <i class="pi pi-times-circle text-6xl text-danger" />
        </div>
        <div>
          <h1 class="mb-2 text-2xl font-bold text-color">
            {{ T('failed.title') }}
          </h1>
          <p class="text-muted-color">
            {{ T('failed.description') }}
          </p>
        </div>
        <div class="flex flex-wrap justify-center gap-3">
          <Button
            :label="T('failed.tryAgain')"
            icon="pi pi-refresh"
            @click="goToSubscription"
          />
        </div>
      </template>

      <!-- Expired state -->
      <template v-else-if="isExpired">
        <div
          class="
            flex size-24 items-center justify-center rounded-full bg-warn/10
          "
        >
          <i class="pi pi-clock text-6xl text-warn" />
        </div>
        <div>
          <h1 class="mb-2 text-2xl font-bold text-color">
            {{ T('expired.title') }}
          </h1>
          <p class="text-muted-color">
            {{ T('expired.description') }}
          </p>
        </div>
        <Button
          :label="T('expired.createNew')"
          icon="pi pi-plus"
          @click="goToSubscription"
        />
      </template>

      <!-- Not found / Error state -->
      <template v-else>
        <div
          class="
            flex size-24 items-center justify-center rounded-full bg-warn/10
          "
        >
          <i class="pi pi-exclamation-circle text-6xl text-warn" />
        </div>
        <div>
          <h1 class="mb-2 text-2xl font-bold text-color">
            {{ T('notFound.title') }}
          </h1>
          <p class="text-muted-color">
            {{ T('notFound.description') }}
          </p>
        </div>
        <Button
          :label="T('backToSubscription')"
          icon="pi pi-arrow-left"
          @click="goToSubscription"
        />
      </template>
    </div>
  </div>
</template>
