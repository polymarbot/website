<script setup lang="ts">
import RankingItem from './components/RankingItem.vue'
import StrategyDetailModal from './components/StrategyDetailModal/index.vue'
import { MOCK_RANKINGS } from './mockData'

definePageMeta({
  layout: 'app',
  title: 'pages.app.rankings.title',
})

const T = useTranslations('pages.app.rankings')
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
  symbol: string
  interval: string
  minAmount: string
  maxAmount: string
}>({
  datePreset: '',
  customStart: '',
  customEnd: '',
  symbol: '',
  interval: '',
  minAmount: '',
  maxAmount: '',
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

// Computed arrays for filter component - convert between comma-separated strings and arrays
const selectedSymbols = computed({
  get: () => filters.symbol ? filters.symbol.split(',') as MarketSymbolType[] : [],
  set: (val: MarketSymbolType[]) => {
    filters.symbol = val.join(',')
  },
})

const selectedIntervals = computed({
  get: () => filters.interval ? filters.interval.split(',') as MarketIntervalType[] : [],
  set: (val: MarketIntervalType[]) => {
    filters.interval = val.join(',')
  },
})

// Amount range filters
const minAmount = computed({
  get: () => filters.minAmount ? Number(filters.minAmount) : undefined,
  set: (val: number | undefined) => {
    filters.minAmount = val ? String(val) : ''
  },
})

const maxAmount = computed({
  get: () => filters.maxAmount ? Number(filters.maxAmount) : undefined,
  set: (val: number | undefined) => {
    filters.maxAmount = val ? String(val) : ''
  },
})

// Clear amount range filter
function clearAmountRange () {
  minAmount.value = undefined
  maxAmount.value = undefined
}

// Check if amount range filter is active
const hasAmountFilter = computed(() => filters.minAmount || filters.maxAmount)

// Load rankings
async function loadRankings () {
  // For FREE users, don't make API call
  if (!subscription.hasStatsAccess.value) {
    rankings.value = MOCK_RANKINGS
    loading.value = false
    return
  }

  loading.value = true
  try {
    const query: Record<string, any> = {
      datePreset: filters.datePreset,
    }

    // Include custom date range if preset is CUSTOM
    if (filters.datePreset === StatsDatePreset.CUSTOM) {
      if (filters.customStart) {
        query.customStart = filters.customStart
      }
      if (filters.customEnd) {
        query.customEnd = filters.customEnd
      }
    }

    if (filters.symbol) {
      query.symbol = filters.symbol
    }
    if (filters.interval) {
      query.interval = filters.interval
    }
    if (filters.minAmount) {
      query.minAmount = filters.minAmount
    }
    if (filters.maxAmount) {
      query.maxAmount = filters.maxAmount
    }

    // Minimum base count for statistical significance (hidden parameter)
    query.minBaseCount = 10

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

// Initialize datePreset based on plan when subscription is loaded
watch(
  subscription.subscription,
  sub => {
    if (sub) {
      const allowedPresets = subscription.allowedStatsPresets.value
      if (!filters.datePreset || !allowedPresets.includes(filters.datePreset as StatsDatePresetType)) {
        filters.datePreset = subscription.defaultStatsPreset.value
      }
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
          v-model:symbols="selectedSymbols"
          v-model:intervals="selectedIntervals"
          :allowedDatePresets="subscription.allowedStatsPresets.value"
        >
          <template #append>
            <!-- Amount range filter -->
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-sm text-muted-color">
                {{ T('filters.amountRange') }}:
              </span>
              <div class="w-64">
                <InputRange
                  v-model:start="minAmount"
                  v-model:end="maxAmount"
                  :min="0"
                  :max="10000"
                  size="small"
                  mode="currency"
                  currency="USD"
                />
              </div>

              <!-- Clear amount range button -->
              <Button
                v-if="hasAmountFilter"
                size="small"
                severity="secondary"
                text
                icon="pi pi-times"
                @click="clearAmountRange"
              >
                {{ TC('actions.clear') }}
              </Button>
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
      :defaultSymbol="filters.symbol || undefined"
    />
  </PageCard>
</template>
