<script setup lang="ts">
definePageMeta({
  layout: 'transparent',
  title: 'pages.app.subscription.payments._id_.cancel.name',
})

const T = useTranslations('pages.app.subscription.payments._id_.cancel')
const route = useRoute()
const router = useRouter()
const request = useRequest()

const paymentId = computed(() => route.params.id as string)
const payment = ref<SubscriptionPaymentItem | null>(null)

onMounted(async () => {
  payment.value = await request.get<SubscriptionPaymentItem>(
    `/api/subscription/payments/${paymentId.value}`,
  )
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
      <!-- Cancel icon -->
      <div
        class="flex size-24 items-center justify-center rounded-full bg-warn/10"
      >
        <i class="pi pi-times-circle text-6xl text-warn" />
      </div>

      <!-- Title and description -->
      <div>
        <h1 class="mb-2 text-2xl font-bold text-color">
          {{ T('title') }}
        </h1>
        <p class="text-muted-color">
          {{ T('description') }}
        </p>
      </div>

      <!-- Common reasons -->
      <div
        class="
          w-full max-w-md rounded-lg border border-surface bg-surface p-4
          text-left
        "
      >
        <h3 class="mb-3 font-semibold text-color">
          {{ T('reasons.title') }}
        </h3>
        <ul class="flex flex-col gap-2 text-sm text-muted-color">
          <li class="flex items-center gap-2">
            <span class="size-1 shrink-0 rounded-full bg-current" />
            {{ T('reasons.cancelled') }}
          </li>
          <li class="flex items-center gap-2">
            <span class="size-1 shrink-0 rounded-full bg-current" />
            {{ T('reasons.expired') }}
          </li>
          <li class="flex items-center gap-2">
            <span class="size-1 shrink-0 rounded-full bg-current" />
            {{ T('reasons.insufficientFunds') }}
          </li>
          <li class="flex items-center gap-2">
            <span class="size-1 shrink-0 rounded-full bg-current" />
            {{ T('reasons.networkError') }}
          </li>
        </ul>
      </div>

      <!-- Action buttons -->
      <div class="flex flex-wrap justify-center gap-3">
        <Button
          :label="T('backToSubscription')"
          icon="pi pi-arrow-left"
          :severity="payment?.hostedUrl ? 'secondary' : undefined"
          :outlined="!!payment?.hostedUrl"
          @click="goToSubscription"
        />
        <Button
          v-if="payment?.hostedUrl"
          :label="T('retryPayment')"
          icon="pi pi-refresh"
          @click="goToPaymentPage"
        />
      </div>
    </div>
  </div>
</template>
