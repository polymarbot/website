<script setup lang="ts">
import type { DataTableColumn } from '~/components/ui/DataTable/index.vue'
import type {
  AsyncDataTableFetchParams,
  AsyncDataTableFetchResult,
} from '~/components/ui/AsyncDataTable/index.vue'

import { getIntervalLabel } from '~/components/app/MarketIntervalSelect/utils'

definePageMeta({
  layout: 'app',
  title: 'pages.app.wallets._funder_.transactions.title',
})

const route = useRoute()
const T = useTranslations('pages.app.wallets._funder_.transactions')
const request = useRequest()
const { formatDateRange } = useDate()

// Get wallet funder address from route
const funderAddress = computed(() => route.params.funder as string)

// Wallet data
const wallet = ref<WalletItem | null>(null)

// Load wallet details
async function loadWallet () {
  wallet.value = await request.get(`/api/wallets/${funderAddress.value}`)
}

// Load wallet on mount
onMounted(loadWallet)

// Profit history data
const profitHistory = ref<{ data: DailyProfit[] } | null>(null)
const profitHistoryLoading = ref(true)

// Load profit history
async function loadProfitHistory () {
  profitHistoryLoading.value = true
  try {
    profitHistory.value = await request.get(`/api/wallets/${funderAddress.value}/profit-history`, {
      query: { days: 30 },
    })
  } finally {
    profitHistoryLoading.value = false
  }
}

// Load profit history on mount
onMounted(loadProfitHistory)

// Fetch transaction history for AsyncDataTable
async function fetchTransactions ({ offset, limit }: AsyncDataTableFetchParams): Promise<AsyncDataTableFetchResult<WalletTransactionItem>> {
  const response = await request.get<{
    items: WalletTransactionItem[]
    pagination: { total: number }
  }>(`/api/wallets/${funderAddress.value}/transactions`, {
    query: { offset, limit },
  })
  return {
    items: response.items ?? [],
    total: response.pagination.total ?? 0,
  }
}

// Get action severity
function getActionSeverity (action: WalletTransactionActionType): 'success' | 'info' | 'warn' {
  switch (action) {
    case WalletTransactionAction.BUY:
      return 'success'
    case WalletTransactionAction.SELL:
      return 'warn'
    case WalletTransactionAction.CLAIM:
      return 'info'
    default:
      return 'info'
  }
}

// Get amount color class based on value
function getAmountColorClass (amount: string): string {
  const value = Number(amount)
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-danger'
  return 'text-muted-color'
}

// Get amount prefix based on value
function getAmountPrefix (amount: string): string {
  return Number(amount) > 0 ? '+' : ''
}

// Market info type
interface MarketInfo {
  label: string
  url: string
  duration: string
}

// Cache for market info to avoid repeated calculations
const marketInfoCache = new Map<string, MarketInfo | null>()

function getMarketInfo (slug?: string): MarketInfo | null {
  if (!slug) return null

  // Return cached result if available
  if (marketInfoCache.has(slug)) {
    return marketInfoCache.get(slug)!
  }

  const { symbol, interval, startTime, endTime } = parseSlug(slug)
  if (!symbol || !interval) {
    marketInfoCache.set(slug, null)
    return null
  }

  const result: MarketInfo = {
    label: `${getSymbolName(symbol)} - ${getIntervalLabel(interval)}`,
    url: generateMarketUrl(slug),
    duration: formatDateRange(startTime, endTime),
  }

  // Cache the result
  marketInfoCache.set(slug, result)
  return result
}

// Table columns definition
const columns: DataTableColumn[] = [
  {
    field: 'action',
    title: T('table.action'),
  },
  {
    field: 'amount',
    title: T('table.amount'),
    type: 'currency',
  },
  {
    field: 'market',
    title: T('table.market'),
  },
  {
    field: 'transactionHash',
    title: T('table.transactionHash'),
  },
  {
    field: 'timestamp',
    title: T('table.timestamp'),
    type: 'date',
  },
]
</script>

<template>
  <PageCard
    :title="T('title')"
    back
  >
    <template #subtitle>
      <div class="flex items-center gap-2">
        <AppAddressDisplay
          class="flex-wrap"
          :name="wallet?.name"
          :address="funderAddress"
          :balance="wallet?.balance"
          :href="`https://polymarket.com/${funderAddress}`"
          copyable
        />
      </div>
    </template>

    <!-- Profit History Chart -->
    <div
      class="
        mb-6
        sm:px-4
      "
    >
      <h3 class="mb-4 text-lg font-medium text-muted-color">
        {{ T('profitHistory.title') }}
      </h3>
      <ChartProfitHistory
        :data="profitHistory?.data ?? []"
        :loading="profitHistoryLoading"
        height="350px"
      />
    </div>

    <!-- Notice -->
    <Message
      severity="info"
      class="mx-4 mb-4"
    >
      {{ T('notice') }}
    </Message>

    <AsyncDataTable
      :columns="columns"
      :fetchMethod="fetchTransactions"
      :tableProps="{ scrollable: true, scrollHeight: 'flex' }"
    >
      <!-- Amount header -->
      <template #header-amount>
        <div class="flex items-center gap-2">
          <span>{{ T('table.amount') }}</span>
          <Help text="USDC.e">
            <IconUSDC :size="16" />
          </Help>
        </div>
      </template>

      <!-- Action column -->
      <template #action="{ row }">
        <Tag
          :severity="getActionSeverity(row.action)"
          size="small"
        >
          {{ T(`action.${row.action}`) }}
        </Tag>
      </template>

      <!-- Amount column -->
      <template #amount="{ row }">
        <span :class="getAmountColorClass(row.amount)">
          {{ getAmountPrefix(row.amount) }}{{ formatCurrency(row.amount) }}
        </span>
      </template>

      <!-- Market column -->
      <template #market="{ row }">
        <div
          v-if="getMarketInfo(row.slug)"
          class="flex flex-col items-start gap-1"
        >
          <Tooltip :text="T('tooltip.marketLink')">
            <WebLink
              :href="getMarketInfo(row.slug)!.url"
              unstyled
              class="
                font-medium text-color
                hover:underline
              "
            >
              {{ getMarketInfo(row.slug)!.label }}
            </WebLink>
          </Tooltip>
          <span class="text-sm text-muted-color">
            {{ getMarketInfo(row.slug)!.duration }}
          </span>
        </div>
        <span
          v-else
          class="text-muted-color"
        >
          -
        </span>
      </template>

      <!-- Transaction Hash column -->
      <template #transactionHash="{ row }">
        <AppAddressDisplay
          v-if="row.transactionHash"
          :address="row.transactionHash"
          :href="`https://polygonscan.com/tx/${row.transactionHash}`"
          copyable
        />
        <span
          v-else
          class="text-muted-color"
        >
          -
        </span>
      </template>
    </AsyncDataTable>
  </PageCard>
</template>
