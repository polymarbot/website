<script setup lang="ts">
import TradeStepCard from '../TradeStepCard/index.vue'

interface Props {
  visible: boolean
  interval: MarketIntervalType
  strategyJson: string
  /** Only show statistics, hide strategy details */
  statsOnly?: boolean
  /** Hide footer (default: true) */
  hideFooter?: boolean
  /** Default date preset */
  defaultDatePreset?: StatsDatePresetType
  /** Default selected symbols, comma-separated (optional, e.g., "btc,eth") */
  defaultSymbol?: string
}

const props = withDefaults(defineProps<Props>(), {
  statsOnly: false,
  hideFooter: true,
  defaultDatePreset: undefined,
  defaultSymbol: undefined,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const localVisible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const T = useTranslations('pages.app.strategies._id_.components.StrategyStatsModal')
const TStrategy = useTranslations('pages.app.strategies._id_')
const TStrategySteps = useTranslations('pages.app.strategies._id_.components.StrategyStepsInput')
const request = useRequest()

// Subscription state
const subscription = useSubscription()

// Effective default date preset: props > subscription default
const effectiveDefaultDatePreset = computed(() => {
  return props.defaultDatePreset ?? subscription.defaultStatsPreset.value
})

// Filter state
const selectedDatePreset = ref<StatsDatePresetType>(effectiveDefaultDatePreset.value)
const selectedCustomStart = ref<number | undefined>(undefined)
const selectedCustomEnd = ref<number | undefined>(undefined)
const selectedSymbols = ref<MarketSymbolType[]>([])

// Stats data
const stats = ref<StrategyStats | null>(null)
const loading = ref(false)

// Parse steps from JSON string
const steps = computed<TradeStep[]>(() => {
  return safeJsonParse(props.strategyJson, [])
})

// Computed string for API (comma-separated)
const selectedSymbolsString = computed(() => {
  return selectedSymbols.value.length > 0 ? selectedSymbols.value.join(',') : undefined
})

// Calculate total amount for buy steps
const totalAmount = computed(() => {
  return calculateStrategyMaxAmount(steps.value)
})

// Count buy and sell steps
const buyCount = computed(() => steps.value.filter(s => s.side === TradeSide.BUY).length)
const sellCount = computed(() => steps.value.filter(s => s.side === TradeSide.SELL).length)

// Load stats from API
async function loadStats () {
  // For FREE users, don't make API call
  if (!subscription.hasStatsAccess.value) {
    stats.value = null
    loading.value = false
    return
  }

  loading.value = true
  stats.value = null

  try {
    const payload: Record<string, any> = {
      strategyJson: props.strategyJson,
      interval: props.interval,
      symbols: selectedSymbolsString.value,
      datePreset: selectedDatePreset.value,
    }

    // Include custom date range if preset is CUSTOM
    if (selectedDatePreset.value === StatsDatePreset.CUSTOM) {
      if (selectedCustomStart.value) {
        payload.customStart = selectedCustomStart.value
      }
      if (selectedCustomEnd.value) {
        payload.customEnd = selectedCustomEnd.value
      }
    }

    const result = await request.post<StrategyStats | null>('/api/market-strategies/stats', payload)
    stats.value = result
  } catch (error) {
    console.error('Failed to load strategy stats:', error)
  } finally {
    loading.value = false
  }
}

// Initialize selected symbols from prop
function initializeSelectedSymbols () {
  if (props.defaultSymbol) {
    selectedSymbols.value = props.defaultSymbol.split(',').filter(Boolean) as MarketSymbolType[]
  } else {
    selectedSymbols.value = []
  }
}

// Watch for filter changes (date preset, custom dates, and symbols)
watch([ selectedDatePreset, selectedCustomStart, selectedCustomEnd, selectedSymbols ], () => {
  if (props.visible && subscription.subscription.value) {
    loadStats()
  }
}, { deep: true })

// Load stats when modal becomes visible
watch(() => props.visible, visible => {
  if (visible) {
    selectedDatePreset.value = effectiveDefaultDatePreset.value
    selectedCustomStart.value = undefined
    selectedCustomEnd.value = undefined
    initializeSelectedSymbols()
    if (subscription.subscription.value) {
      loadStats()
    } else {
      subscription.fetchSubscription()
    }
  }
}, { immediate: true })

// Watch subscription and reload stats when it changes
watch(() => subscription.subscription.value, sub => {
  if (sub && props.visible) {
    loadStats()
  }
})
</script>

<template>
  <Modal
    v-model:visible="localVisible"
    :title="T('title')"
    showClose
    :hideFooter="hideFooter"
  >
    <!-- Pass through footerLeft slot -->
    <template #footerLeft>
      <slot name="footerLeft" />
    </template>

    <div class="flex flex-col gap-6">
      <!-- AppUpgradeOverlay wraps filters and stats for FREE users, only show after subscription is loaded -->
      <AppUpgradeOverlay
        :show="!!subscription.subscription.value && !subscription.hasStatsAccess.value"
        :title="T('upgradeRequired.title')"
        :description="T('upgradeRequired.description')"
      >
        <div class="flex flex-col gap-6">
          <!-- Filters -->
          <AppStrategyFilters
            v-model:datePreset="selectedDatePreset"
            v-model:customStart="selectedCustomStart"
            v-model:customEnd="selectedCustomEnd"
            v-model:symbols="selectedSymbols"
            :intervals="[ interval ]"
            :readonly="[ 'intervals' ]"
            :allowedDatePresets="subscription.allowedStatsPresets.value"
          />

          <!-- Statistics -->
          <div class="flex flex-col gap-2">
            <div class="text-lg font-semibold">
              {{ T('statistics') }}
            </div>

            <!-- Empty state (only when not loading and no stats, for paid users) -->
            <EmptyState
              v-if="subscription.hasStatsAccess.value && !loading && !stats"
              class="py-4"
            />

            <!-- Stats cards -->
            <div
              v-else
              class="
                flex gap-3 overflow-x-auto p-1
                sm:grid sm:grid-cols-2
              "
            >
              <!-- APR -->
              <Card class="bg-surface-alt">
                <template #content>
                  <div class="flex flex-col gap-1 whitespace-nowrap">
                    <div class="text-sm text-muted-color">
                      {{ T('stats.apr') }}
                    </div>
                    <template v-if="loading || !stats">
                      <Skeleton
                        height="1.5rem"
                        width="5rem"
                        class="my-1"
                      />
                      <Skeleton
                        height="1rem"
                        width="6rem"
                      />
                    </template>
                    <template v-else>
                      <div
                        class="text-2xl font-bold"
                        :class="stats.apr > 0 ? 'text-success' : stats.apr < 0 ? `
                          text-danger
                        ` : `text-muted-color`"
                      >
                        {{ formatPercent(stats.apr) }}
                      </div>
                      <div class="text-xs text-muted-color">
                        {{ formatPercent(stats.profitRate) }} ({{ stats.total }})
                      </div>
                    </template>
                  </div>
                </template>
              </Card>

              <!-- Profit Rate -->
              <Card class="bg-surface-alt">
                <template #content>
                  <div class="flex flex-col gap-1 whitespace-nowrap">
                    <div class="text-sm text-muted-color">
                      {{ T('stats.profitRate') }}
                    </div>
                    <template v-if="loading || !stats">
                      <Skeleton
                        height="1.5rem"
                        width="5rem"
                        class="my-1"
                      />
                      <Skeleton
                        height="1rem"
                        width="8rem"
                      />
                    </template>
                    <template v-else>
                      <div
                        class="text-2xl font-bold"
                        :class="stats.profitRate > 0 ? 'text-success' : stats.profitRate < 0 ? `
                          text-danger
                        ` : `text-muted-color`"
                      >
                        {{ formatPercent(stats.profitRate) }}
                      </div>
                      <div class="text-xs text-muted-color">
                        {{ formatCurrency(stats.totalProfit) }} / {{ formatCurrency(stats.totalCost) }}
                      </div>
                    </template>
                  </div>
                </template>
              </Card>

              <!-- Win Rate -->
              <Card class="bg-surface-alt">
                <template #content>
                  <div class="flex flex-col gap-1 whitespace-nowrap">
                    <div class="text-sm text-muted-color">
                      {{ T('stats.winRate') }}
                    </div>
                    <template v-if="loading || !stats">
                      <Skeleton
                        height="1.5rem"
                        width="5rem"
                        class="my-1"
                      />
                      <Skeleton
                        height="1rem"
                        width="4rem"
                      />
                    </template>
                    <template v-else>
                      <div class="text-2xl font-bold text-info">
                        {{ formatPercent(stats.winRate) }}
                      </div>
                      <div class="text-xs text-muted-color">
                        {{ stats.profitable }} / {{ stats.participated }}
                      </div>
                    </template>
                  </div>
                </template>
              </Card>

              <!-- Hit Rate -->
              <Card class="bg-surface-alt">
                <template #content>
                  <div class="flex flex-col gap-1 whitespace-nowrap">
                    <div class="text-sm text-muted-color">
                      {{ T('stats.hitRate') }}
                    </div>
                    <template v-if="loading || !stats">
                      <Skeleton
                        height="1.5rem"
                        width="5rem"
                        class="my-1"
                      />
                      <Skeleton
                        height="1rem"
                        width="4rem"
                      />
                    </template>
                    <template v-else>
                      <div class="text-2xl font-bold text-primary">
                        {{ formatPercent(stats.hitRate) }}
                      </div>
                      <div class="text-xs text-muted-color">
                        {{ stats.participated }} / {{ stats.total }}
                      </div>
                    </template>
                  </div>
                </template>
              </Card>
            </div>
          </div>
        </div>
      </AppUpgradeOverlay>

      <!-- Strategy Details (when not statsOnly) -->
      <template v-if="!statsOnly">
        <!-- Trade Steps -->
        <div class="flex flex-col gap-4">
          <div class="text-lg font-semibold">
            {{ TStrategy('fields.strategyJson') }}
          </div>

          <!-- Header stats -->
          <div class="flex flex-wrap items-center gap-4">
            <!-- Step count -->
            <span class="text-sm text-muted-color">
              {{ T('stepCount', { count: steps.length }) }}
            </span>

            <!-- Buy/Sell count -->
            <div class="flex gap-2 text-sm">
              <Tag
                severity="success"
                size="small"
              >
                {{ TStrategySteps('stats.buyCount', { count: buyCount }) }}
              </Tag>
              <Tag
                severity="danger"
                size="small"
              >
                {{ TStrategySteps('stats.sellCount', { count: sellCount }) }}
              </Tag>
            </div>

            <!-- Total amount -->
            <div class="text-sm">
              <span class="text-muted-color">
                {{ TStrategySteps('stats.totalAmount') }} ≈
              </span>
              <span class="ml-1 font-semibold">
                {{ formatCurrency(totalAmount) }}
              </span>
            </div>
          </div>

          <!-- Empty state -->
          <Message
            v-if="steps.length === 0"
            severity="secondary"
          >
            {{ TStrategySteps('emptyState') }}
          </Message>

          <!-- Step cards grid -->
          <div
            v-else
            class="
              flex gap-3 overflow-x-auto p-1
              sm:grid sm:grid-cols-2
            "
          >
            <TradeStepCard
              v-for="(step, index) in steps"
              :key="index"
              :step="step"
              readonly
            />
          </div>
        </div>
      </template>
    </div>
  </Modal>
</template>
