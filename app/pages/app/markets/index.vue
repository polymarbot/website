<script setup lang="ts">
import { getIntervalLabel } from '~/components/app/MarketIntervalSelect/utils'

definePageMeta({
  layout: 'app',
  title: 'pages.app.markets.name',
})

const T = useTranslations('pages.app.markets')
const request = useRequest()

// Bot counts per market (enabled/total)
const botCounts = ref<Record<string, BotCountItem>>({})

onMounted(fetchData)
async function fetchData () {
  try {
    botCounts.value = await request.get<Record<string, BotCountItem>>('/api/bots/counts')
  } catch (error) {
    console.error('Failed to fetch bot counts:', error)
  }
}

// Get bot count for a specific market
function getBotCount (symbol: MarketSymbolType, interval: MarketIntervalType): BotCountItem | null {
  const key = `${symbol}-${interval}`
  return botCounts.value[key] ?? null
}

// Get badge severity based on bot enabled status
function getBotCountSeverity (count: BotCountItem): 'success' | 'info' | 'secondary' {
  if (count.enabled === 0) return 'secondary' // Gray when no bots enabled
  if (count.enabled === count.total) return 'success' // Green when all enabled
  return 'info' // Blue when partially enabled
}

// Get tooltip content for bot count badge
function getBotCountTooltip (count: BotCountItem): string {
  return `${T('tooltip.enabledBots')}: ${count.enabled}\n${T('tooltip.totalBots')}: ${count.total}`
}

// URL-synced filters (comma-separated strings)
const filters = useFilters<{
  symbols: string
  intervals: string
}>({
  symbols: '',
  intervals: '',
})

// Computed arrays for UI - convert between comma-separated strings and arrays
const selectedSymbols = computed({
  get: () => filters.symbols ? filters.symbols.split(',') as MarketSymbolType[] : [],
  set: (val: MarketSymbolType[]) => {
    filters.symbols = val.join(',')
  },
})

const selectedIntervals = computed({
  get: () => filters.intervals ? filters.intervals.split(',') as MarketIntervalType[] : [],
  set: (val: MarketIntervalType[]) => {
    filters.intervals = val.join(',')
  },
})

// All available symbols and intervals
const symbols = Object.values(MarketSymbol)
const intervals = Object.values(MarketInterval)

// Filter markets based on selection
const filteredMarkets = computed(() => {
  const markets: { symbol: MarketSymbolType, interval: MarketIntervalType }[] = []

  const filterSymbols = selectedSymbols.value.length > 0
    ? selectedSymbols.value
    : symbols
  const filterIntervals = selectedIntervals.value.length > 0
    ? selectedIntervals.value
    : intervals

  for (const symbol of filterSymbols) {
    for (const interval of filterIntervals) {
      markets.push({ symbol, interval })
    }
  }

  return markets
})

// Get display name for symbol
function getSymbolName (symbol: MarketSymbolType) {
  return symbol.toUpperCase()
}

// Navigate to bots list with filters
function navigateToMarket (symbol: MarketSymbolType, interval: MarketIntervalType) {
  navigateTo({
    path: '/app/bots',
    query: {
      symbols: symbol,
      intervals: interval,
    },
  })
}
</script>

<template>
  <PageCard :title="T('name')">
    <!-- Filters -->
    <div class="mb-6">
      <AppStrategyFilters
        v-model:symbols="selectedSymbols"
        v-model:intervals="selectedIntervals"
        :showIntervalMinutes="false"
      />
    </div>

    <!-- Market Cards Grid -->
    <div
      class="
        grid grid-cols-2 gap-4
        lg:grid-cols-3
        xl:grid-cols-4
      "
    >
      <div
        v-for="market in filteredMarkets"
        :key="`${market.symbol}-${market.interval}`"
        class="
          relative cursor-pointer rounded-lg border border-surface p-4
          transition-all duration-200
          hover:border-primary hover:shadow-lg
        "
        @click="navigateToMarket(market.symbol, market.interval)"
      >
        <div class="flex items-center gap-3">
          <!-- Symbol icon -->
          <img
            :src="getSymbolImage(market.symbol)"
            :alt="getSymbolName(market.symbol)"
            class="size-10 rounded-full"
          >

          <!-- Market info -->
          <div class="flex-1">
            <div class="text-lg font-semibold">
              {{ getSymbolName(market.symbol) }}
            </div>
            <div class="text-sm text-muted-color">
              {{ getIntervalLabel(market.interval) }}
            </div>
          </div>

          <!-- Bot count badge - top right on mobile, inline on lg+ -->
          <Tooltip
            v-if="getBotCount(market.symbol, market.interval)"
            :text="getBotCountTooltip(getBotCount(market.symbol, market.interval)!)"
            class="
              absolute -top-2 -right-2
              lg:static
            "
          >
            <Badge
              :severity="getBotCountSeverity(getBotCount(market.symbol, market.interval)!)"
              :value="`${getBotCount(market.symbol, market.interval)!.enabled}/${getBotCount(market.symbol, market.interval)!.total}`"
              class="animate-pop rounded-full"
            />
          </Tooltip>

          <!-- Arrow icon -->
          <i class="pi pi-chevron-right text-muted-color" />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="filteredMarkets.length === 0"
      class="flex flex-col items-center gap-3 py-12 text-muted-color"
    >
      <i class="pi pi-search text-4xl" />
      <span>{{ T('empty') }}</span>
    </div>
  </PageCard>
</template>
