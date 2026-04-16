<script setup lang="ts">
import RankingItem from './components/RankingItem.vue'
import StrategyDetailModal from './components/StrategyDetailModal/index.vue'
import { MOCK_RANKINGS } from './mockData'

definePageMeta({
  title: 'pages.rankings.title',
})

const T = useTranslations('pages.rankings')
const TC = useTranslations('common')
const request = useRequest()

// Subscription state
const subscription = useSubscription()

// Modal state
const showStrategyDetail = ref(false)
const selectedStrategy = ref<StrategyRanking | null>(null)

// URL-synced filters (aligned with API parameters)
const filters = useFilters<{
  datePreset: string
  customStart: string
  customEnd: string
  symbols: string
  intervals: string
  minBuySize: string
  maxBuySize: string
  minRecordCount: string
  minParticipatedCount: string
}>({
  datePreset: '',
  customStart: '',
  customEnd: '',
  symbols: '',
  intervals: '',
  minBuySize: '',
  maxBuySize: '',
  minRecordCount: '10',
  minParticipatedCount: '0',
})

// Rankings data
const rankings = ref<RankingsResponse | null>(null)
const loading = ref(true)

// Typed datePreset computed
const datePreset = computed({
  get: () => filters.datePreset as StatsDatePresetType,
  set: (val: StatsDatePresetType) => {
    filters.datePreset = val
  },
})

// Custom date range (Unix timestamp in seconds)
const customStart = computed({
  get: () => filters.customStart ? Number(filters.customStart) : undefined,
  set: (val: number | undefined) => {
    filters.customStart = val ? String(val) : ''
  },
})

const customEnd = computed({
  get: () => filters.customEnd ? Number(filters.customEnd) : undefined,
  set: (val: number | undefined) => {
    filters.customEnd = val ? String(val) : ''
  },
})

// Plan-enforced upper limit for maxBuySize
const planMaxBuySize = computed(() => subscription.limits.value.maxBuySize)

// Upgrade modal state
const showUpgradeModal = ref(false)
const upgradeTargetPlan = ref<SubscriptionPlanType | undefined>(undefined)

// Clamp value to plan limit, show upgrade modal if exceeded
function clampToPlanLimit (val: number | undefined): number | undefined {
  if (val != null && planMaxBuySize.value !== null && val > planMaxBuySize.value) {
    upgradeTargetPlan.value = undefined
    showUpgradeModal.value = true
    return planMaxBuySize.value
  }
  return val
}

// Force InputNumber to display the corrected value.
// Vue batches synchronous ref changes (e.g. 200→399→200) and skips re-render when final value
// equals the initial one. By first accepting the raw value then correcting via nextTick,
// the correction happens in a separate render cycle so InputNumber sees a real prop change.
function forceInputValue (target: Ref<number | undefined>, raw: number | undefined, corrected: number | undefined) {
  if (corrected !== raw) {
    target.value = raw
    nextTick(() => {
      target.value = corrected
    })
  } else {
    target.value = corrected
  }
}

// Buy size range filters (pre-filled with defaults for better spinner UX)
const DEFAULT_MIN_BUY_SIZE = 5

const minBuySize = ref<number | undefined>(DEFAULT_MIN_BUY_SIZE)

function handleMinBuySizeInput (val: number | undefined) {
  const clamped = clampToPlanLimit(val)
  forceInputValue(minBuySize, val, clamped)
}

const maxBuySize = ref<number | undefined>(undefined)

function handleMaxBuySizeInput (val: number | undefined) {
  const clamped = clampToPlanLimit(val)
  forceInputValue(maxBuySize, val, clamped)
}

// Min record count filter
const DEFAULT_MIN_RECORD_COUNT = 10

const isPlusOrAbove = computed(() =>
  getPlanIndex(subscription.currentPlan.value) >= getPlanIndex(SubscriptionPlan.PLUS),
)

const minRecordCount = ref<number | undefined>(DEFAULT_MIN_RECORD_COUNT)

function handleMinRecordCountInput (val: number | undefined) {
  if (!isPlusOrAbove.value && val != null && val > DEFAULT_MIN_RECORD_COUNT) {
    upgradeTargetPlan.value = SubscriptionPlan.PLUS
    showUpgradeModal.value = true
    forceInputValue(minRecordCount, val, DEFAULT_MIN_RECORD_COUNT)
    return
  }
  minRecordCount.value = val
}

// Min participated count filter
const DEFAULT_MIN_PARTICIPATED_COUNT = 0

const minParticipatedCount = ref<number | undefined>(DEFAULT_MIN_PARTICIPATED_COUNT)

function handleMinParticipatedCountInput (val: number | undefined) {
  if (!isPlusOrAbove.value && val !== DEFAULT_MIN_PARTICIPATED_COUNT) {
    upgradeTargetPlan.value = SubscriptionPlan.PLUS
    showUpgradeModal.value = true
    forceInputValue(minParticipatedCount, val, DEFAULT_MIN_PARTICIPATED_COUNT)
    return
  }
  minParticipatedCount.value = val
}

// Sync local InputNumber values to filters (called on blur)
// Double nextTick ensures this runs after forceInputValue's correction
function syncInputFilters () {
  nextTick(() => nextTick(() => {
    filters.minBuySize = minBuySize.value != null && minBuySize.value !== DEFAULT_MIN_BUY_SIZE ? String(minBuySize.value) : ''
    filters.maxBuySize = maxBuySize.value != null && maxBuySize.value !== planMaxBuySize.value ? String(maxBuySize.value) : ''
    filters.minRecordCount = String(minRecordCount.value ?? 0)
    filters.minParticipatedCount = String(minParticipatedCount.value ?? 0)
  }))
}

// Clear buy size filter
function clearBuySizeFilter () {
  minBuySize.value = DEFAULT_MIN_BUY_SIZE
  maxBuySize.value = planMaxBuySize.value ?? undefined
  filters.minBuySize = ''
  filters.maxBuySize = ''
}

// Check if buy size filter is active
const hasBuySizeFilter = computed(() => !!filters.minBuySize || !!filters.maxBuySize)

// Load rankings
async function loadRankings () {
  // For FREE users, don't make API call
  if (!subscription.hasStatsAccess.value) {
    rankings.value = MOCK_RANKINGS
    loading.value = false
    return
  }

  // Guard: CUSTOM mode requires valid start and end within MAX_DATE_RANGE_DAYS
  if (filters.datePreset === StatsDatePreset.CUSTOM) {
    const start = Number(filters.customStart)
    const end = Number(filters.customEnd)
    if (!start || !end || start > end || (end - start) > MAX_DATE_RANGE_DAYS * 86400) {
      return
    }
  }

  loading.value = true
  try {
    const query: Record<string, any> = {
      datePreset: filters.datePreset,
    }

    // Include custom date range if preset is CUSTOM
    if (filters.datePreset === StatsDatePreset.CUSTOM) {
      query.customStart = filters.customStart
      query.customEnd = filters.customEnd
    }

    if (filters.symbols) {
      query.symbols = filters.symbols
    }
    if (filters.intervals) {
      query.intervals = filters.intervals
    }
    if (filters.minBuySize) {
      query.minBuySize = filters.minBuySize
    }
    if (filters.maxBuySize) {
      query.maxBuySize = filters.maxBuySize
    }

    // Minimum record/participated count for statistical significance
    query.minRecordCount = minRecordCount.value
    query.minParticipatedCount = minParticipatedCount.value

    rankings.value = await request.get<RankingsResponse>('/api/market-strategies/rankings', { query })
  } finally {
    loading.value = false
  }
}

// Handle strategy item click
function handleStrategyClick (strategy: StrategyRanking) {
  selectedStrategy.value = strategy
  showStrategyDetail.value = true
}

// Get color for profit rate based on value
function getProfitRateColor (value: number): string {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return 'text-muted-color'
}

// Ranking card configurations
const rankingConfigs = [
  {
    type: 'apr',
    icon: 'pi-percentage',
    iconColor: 'text-warn',
    dataKey: 'aprRankings' as const,
    valueKey: 'apr' as const,
    getValueColor: (item: StrategyRanking) => getProfitRateColor(item.apr),
  },
  {
    type: 'profitRate',
    icon: 'pi-chart-line',
    iconColor: 'text-success',
    dataKey: 'profitRateRankings' as const,
    valueKey: 'profitRate' as const,
    getValueColor: (item: StrategyRanking) => getProfitRateColor(item.profitRate),
  },
  {
    type: 'winRate',
    icon: 'pi-trophy',
    iconColor: 'text-info',
    dataKey: 'winRateRankings' as const,
    valueKey: 'winRate' as const,
    getValueColor: () => 'text-info',
  },
  {
    type: 'hitRate',
    icon: 'pi-bullseye',
    iconColor: 'text-primary',
    dataKey: 'hitRateRankings' as const,
    valueKey: 'hitRate' as const,
    getValueColor: () => 'text-primary',
  },
]

// Initialize filters based on plan when subscription is loaded
watch(
  subscription.subscription,
  sub => {
    if (sub) {
      // Clamp datePreset from URL to allowed presets
      const allowedPresets = subscription.allowedStatsPresets.value
      if (!filters.datePreset || !allowedPresets.includes(filters.datePreset as StatsDatePresetType)) {
        filters.datePreset = subscription.defaultStatsPreset.value
      }

      // Clamp filter values from URL to plan limits (reuse handlers for validation)
      handleMinBuySizeInput(filters.minBuySize ? Number(filters.minBuySize) : DEFAULT_MIN_BUY_SIZE)
      handleMaxBuySizeInput(filters.maxBuySize ? Number(filters.maxBuySize) : (planMaxBuySize.value ?? undefined))
      handleMinRecordCountInput(filters.minRecordCount ? Number(filters.minRecordCount) : DEFAULT_MIN_RECORD_COUNT)
      handleMinParticipatedCountInput(filters.minParticipatedCount ? Number(filters.minParticipatedCount) : DEFAULT_MIN_PARTICIPATED_COUNT)
      syncInputFilters()

      loadRankings()
    }
  },
  { immediate: true },
)

// Watch filters changes and reload rankings (only after subscription is loaded)
watch(
  filters,
  () => {
    if (subscription.subscription.value) {
      loadRankings()
    }
  },
  { deep: true },
)

// Fetch subscription on mount
onMounted(() => {
  subscription.fetchSubscription()
})
</script>

<template>
  <PageCard :title="T('title')">
    <!-- AppUpgradeOverlay wraps all content, only show after subscription is loaded -->
    <AppUpgradeOverlay
      :show="!!subscription.subscription.value && !subscription.hasStatsAccess.value"
      :title="T('upgradeRequired.title')"
      :description="T('upgradeRequired.description')"
      sticky
    >
      <!-- Filters -->
      <div class="mb-6">
        <AppStrategyFilters
          v-model:datePreset="datePreset"
          v-model:customStart="customStart"
          v-model:customEnd="customEnd"
          v-model:symbols="filters.symbols"
          v-model:intervals="filters.intervals"
          :allowedDatePresets="subscription.allowedStatsPresets.value"
        >
          <template #append>
            <!-- Buy size range filter -->
            <div class="flex flex-wrap items-center gap-2">
              <span class="flex items-center gap-1 text-sm text-muted-color">
                {{ T('filters.buySizeRange') }}
                <Help :text="T('helps.buySizeRange')" />:
              </span>
              <InputNumber
                :modelValue="minBuySize"
                :min="5"
                size="small"
                class="w-28"
                placeholder="5"
                @update:modelValue="handleMinBuySizeInput"
                @blur="syncInputFilters"
              />
              <span class="text-muted-color">
                -
              </span>
              <InputNumber
                :modelValue="maxBuySize"
                :min="5"
                size="small"
                class="w-28"
                :placeholder="planMaxBuySize === null ? T('filters.max') : String(planMaxBuySize)"
                @update:modelValue="handleMaxBuySizeInput"
                @blur="syncInputFilters"
              />

              <!-- Clear buy size filter button -->
              <Button
                v-if="hasBuySizeFilter"
                size="small"
                severity="secondary"
                text
                icon="pi pi-times"
                @click="clearBuySizeFilter"
              >
                {{ TC('actions.clear') }}
              </Button>
            </div>

            <!-- Min record count filter -->
            <div class="flex flex-wrap items-center gap-2">
              <span class="flex items-center gap-1 text-sm text-muted-color">
                {{ T('filters.minRecordCount') }}
                <Help :text="T('helps.minRecordCount')" />:
              </span>
              <InputNumber
                :modelValue="minRecordCount"
                :min="0"
                :max="10000"
                size="small"
                class="w-28"
                @update:modelValue="handleMinRecordCountInput"
                @blur="syncInputFilters"
              />
            </div>

            <!-- Min participated count filter -->
            <div class="flex flex-wrap items-center gap-2">
              <span class="flex items-center gap-1 text-sm text-muted-color">
                {{ T('filters.minParticipatedCount') }}
                <Help :text="T('helps.minParticipatedCount')" />:
              </span>
              <InputNumber
                :modelValue="minParticipatedCount"
                :min="0"
                :max="10000"
                size="small"
                class="w-28"
                @update:modelValue="handleMinParticipatedCountInput"
                @blur="syncInputFilters"
              />
            </div>
          </template>
        </AppStrategyFilters>
      </div>

      <!-- Loading State -->
      <div
        v-if="loading"
        class="
          grid grid-cols-1 gap-4
          sm:grid-cols-2
          lg:grid-cols-3
          2xl:grid-cols-4
        "
      >
        <Card
          v-for="i in 4"
          :key="i"
          class="bg-surface-alt"
        >
          <template #title>
            <Skeleton width="10rem" />
          </template>
          <template #content>
            <Skeleton
              v-for="j in 10"
              :key="j"
              height="3rem"
              class="mb-2"
            />
          </template>
        </Card>
      </div>

      <!-- Rankings -->
      <div
        v-else
        class="
          grid grid-cols-1 gap-4
          sm:grid-cols-2
          lg:grid-cols-3
          2xl:grid-cols-4
        "
      >
        <Card
          v-for="config in rankingConfigs"
          :key="config.type"
          class="bg-surface-alt"
        >
          <template #title>
            <div class="flex items-center gap-2">
              <i
                class="pi"
                :class="[ config.icon, config.iconColor ]"
              />
              <span>{{ T(`${config.type}.title`) }}</span>
            </div>
          </template>
          <template #subtitle>
            <span class="text-sm text-muted-color">
              {{ T(`${config.type}.description`) }}
            </span>
          </template>
          <template #content>
            <EmptyState
              v-if="rankings?.[config.dataKey].length === 0"
              class="py-8"
            />
            <div
              v-else
              class="-mx-3"
            >
              <RankingItem
                v-for="(item, index) in rankings?.[config.dataKey]"
                :key="item.strategyId"
                :item="item"
                :index="index"
                :highlightValue="formatPercent(item[config.valueKey])"
                :highlightColor="config.getValueColor(item)"
                @click="handleStrategyClick(item)"
              >
                <template #stats>
                  <template v-if="config.type === 'apr'">
                    {{ formatPercent(item.profitRate) }} ({{ item.total }})
                  </template>
                  <template v-else-if="config.type === 'profitRate'">
                    {{ formatCurrency(item.totalProfit) }} / {{ formatCurrency(item.totalCost) }} ({{ item.participated }})
                  </template>
                  <template v-else-if="config.type === 'winRate'">
                    {{ item.profitable }} / {{ item.participated }}
                  </template>
                  <template v-else-if="config.type === 'hitRate'">
                    {{ item.participated }} / {{ item.total }}
                  </template>
                </template>
              </RankingItem>
            </div>
          </template>
        </Card>
      </div>
    </AppUpgradeOverlay>

    <!-- Strategy Detail Modal -->
    <StrategyDetailModal
      v-model:visible="showStrategyDetail"
      :strategy="selectedStrategy"
      :defaultDatePreset="datePreset"
      :defaultCustomStart="customStart"
      :defaultCustomEnd="customEnd"
      :defaultSymbol="filters.symbols || undefined"
    />

    <!-- Upgrade Modal -->
    <AppUpgradeModal
      v-model:visible="showUpgradeModal"
      :targetPlan="upgradeTargetPlan"
    />
  </PageCard>
</template>
