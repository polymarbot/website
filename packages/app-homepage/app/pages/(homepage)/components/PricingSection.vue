<script setup lang="ts">
const T = useTranslations('pages.(homepage)')
const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()

// Plan list for rendering
const planList = computed(() => {
  return Object.entries(SUBSCRIPTION_PLANS).map(([ id, plan ]) => ({
    id: id as SubscriptionPlanType,
    plan,
  }))
})

function formatLimit (value: number | null): string {
  if (value === null) return t('common.labels.unlimited')
  return value.toLocaleString()
}

function formatMaxBuySize (value: number | null): string {
  if (value === null) return ''
  return value.toLocaleString()
}

function getStatsAccess (planId: SubscriptionPlanType) {
  const level = SUBSCRIPTION_PLANS[planId].limits.statsAccess
  if (level === StatsAccess.FULL) {
    return { label: T('pricing.features.statsAccess.full'), icon: 'pi pi-check', iconClass: 'text-success' }
  }
  if (level === StatsAccess.EXTENDED) {
    return { label: T('pricing.features.statsAccess.extended'), icon: 'pi pi-check', iconClass: 'text-success' }
  }
  if (level === StatsAccess.NONE) {
    return { label: T('pricing.features.statsAccess.none'), icon: 'pi pi-minus', iconClass: 'text-muted-color' }
  }
  return { label: T('pricing.features.statsAccess.limited'), icon: 'pi pi-check', iconClass: 'text-success' }
}
</script>

<template>
  <section
    class="
      bg-ground px-4 py-16
      md:py-24
      lg:py-32
      xl:py-40
    "
  >
    <div class="mx-auto max-w-6xl">
      <h2
        class="
          mb-4 text-center text-3xl font-bold text-color
          md:text-4xl
        "
      >
        {{ T('pricing.title') }}
      </h2>
      <p class="mx-auto mb-12 max-w-2xl text-center text-muted-color">
        {{ T('pricing.subtitle') }}
      </p>

      <!-- Pricing Cards -->
      <div
        class="
          grid grid-cols-1 gap-4
          sm:grid-cols-2
          lg:grid-cols-4
        "
      >
        <div
          v-for="{ id, plan } in planList"
          :key="id"
          class="flex flex-col rounded-xl border border-surface bg-surface p-5"
        >
          <!-- Header -->
          <div class="mb-4">
            <h3 class="text-xl font-semibold text-color">
              {{ plan.name }}
            </h3>
            <div class="mt-2 flex items-baseline gap-1">
              <span class="text-3xl font-bold text-color">
                ${{ plan.price }}
              </span>
              <span
                v-if="plan.price > 0"
                class="text-muted-color"
              >
                {{ T('pricing.perMonth') }}
              </span>
            </div>
          </div>

          <!-- Features -->
          <ul class="flex-1 space-y-2 text-sm">
            <li class="flex items-center gap-2">
              <i class="pi pi-check text-xs text-success" />
              <span class="text-muted-color">
                {{ T('pricing.features.wallets', { count: formatLimit(plan.limits.wallets) }) }}
              </span>
            </li>
            <li class="flex items-center gap-2">
              <i class="pi pi-check text-xs text-success" />
              <span class="text-muted-color">
                {{ T('pricing.features.strategies', { count: formatLimit(plan.limits.strategies) }) }}
              </span>
            </li>
            <li class="flex items-center gap-2">
              <i class="pi pi-check text-xs text-success" />
              <span class="text-muted-color">
                {{ T('pricing.features.bots', { count: formatLimit(plan.limits.bots) }) }}
              </span>
            </li>
            <li class="flex items-center gap-2">
              <i class="pi pi-check text-xs text-success" />
              <span class="text-muted-color">
                {{ plan.limits.maxBuySize === null
                  ? T('pricing.features.unlimitedBuySize')
                  : T('pricing.features.maxBuySize', { size: formatMaxBuySize(plan.limits.maxBuySize) })
                }}
              </span>
            </li>
            <li class="flex items-center gap-2">
              <i
                class="text-xs"
                :class="[ getStatsAccess(id).icon, getStatsAccess(id).iconClass ]"
              />
              <span class="text-muted-color">
                {{ getStatsAccess(id).label }}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <!-- CTA Button -->
      <div class="mt-12 text-center">
        <Button
          :label="T('pricing.getStarted')"
          icon="pi pi-arrow-right"
          iconPos="right"
          :href="`${runtimeConfig.public.appOrigin}/auth/sign-up`"
          size="large"
        />
      </div>
    </div>
  </section>
</template>
