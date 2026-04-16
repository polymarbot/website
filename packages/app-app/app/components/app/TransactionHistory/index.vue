<script setup lang="ts">
import type { DataTableColumn } from '@packages/layer-basic/app/components/ui/DataTable/index.vue'
import type {
  AsyncDataTableFetchParams,
  AsyncDataTableFetchResult,
} from '@packages/layer-basic/app/components/ui/AsyncDataTable/index.vue'

import { getIntervalLabel } from '~/components/app/MarketIntervalSelect/utils'

export interface TransactionHistoryProps {
  /** Fetch method for transaction data */
  fetchTransactions: (filters: AsyncDataTableFetchParams) => Promise<AsyncDataTableFetchResult<WalletTransactionItem>>
  /** Fetch method for profit history data */
  fetchProfitHistory: () => Promise<DailyProfit[]>
  /** Whether to show the botId column */
  showBotId?: boolean
}

const props = defineProps<TransactionHistoryProps>()

const T = useTranslations('components.app.TransactionHistory')
const TC = useTranslations('common')
const { formatDateRange } = useDate()

// Profit history - internally managed
const profitHistory = ref<DailyProfit[]>([])
const profitHistoryLoading = ref(true)

async function loadProfitHistory () {
  profitHistoryLoading.value = true
  try {
    profitHistory.value = await props.fetchProfitHistory()
  } finally {
    profitHistoryLoading.value = false
  }
}

onMounted(loadProfitHistory)

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

  marketInfoCache.set(slug, result)
  return result
}

// Table columns definition
const columns = computed<DataTableColumn[]>(() => {
  const cols: DataTableColumn[] = [
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
  ]

  if (props.showBotId) {
    cols.push({
      field: 'botId',
      title: T('table.botId'),
    })
  }

  cols.push({
    field: 'timestamp',
    title: T('table.timestamp'),
    type: 'date',
  })

  return cols
})
</script>

<template>
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
      :data="profitHistory"
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
        <Tooltip :text="TC('labels.viewOnPolymarket')">
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
        :href="getExplorerTxUrl('Polygon', row.transactionHash)"
        :tooltip="T('tooltip.viewOnPolygonscan')"
        copyable
      />
      <span
        v-else
        class="text-muted-color"
      >
        -
      </span>
    </template>

    <!-- Bot ID column -->
    <template
      v-if="showBotId"
      #botId="{ row }"
    >
      <Tooltip
        v-if="row.botId"
        :text="T('tooltip.viewBotTransactions')"
      >
        <WebLink
          :href="`/bots/${row.botId}/transactions`"
          unstyled
          class="
            text-primary
            hover:underline
          "
        >
          {{ replaceMiddleWithDots(row.botId) }}
        </WebLink>
      </Tooltip>
      <span
        v-else
        class="text-muted-color"
      >
        -
      </span>
    </template>
  </AsyncDataTable>
</template>
