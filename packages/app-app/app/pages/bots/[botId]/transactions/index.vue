<script setup lang="ts">
import type {
  AsyncDataTableFetchParams,
  AsyncDataTableFetchResult,
} from '@packages/layer-basic/app/components/ui/AsyncDataTable/index.vue'

import BotInfoTable from '../../components/BotInfoTable/index.vue'

definePageMeta({
  title: 'pages.bots._botId_.transactions.title',
})

const route = useRoute()
const T = useTranslations('pages.bots._botId_.transactions')
const request = useRequest()
const { formatDateTime } = useDate()

// Get bot id from route
const botId = computed(() => route.params.botId as string)

// Bot data
const bot = ref<BotItem | null>(null)

// Load bot details
async function loadBot () {
  bot.value = await request.get(`/api/bots/${botId.value}`)
}

// Load bot on mount
onMounted(loadBot)

// Fetch profit history
async function fetchProfitHistory (): Promise<DailyProfit[]> {
  const response = await request.get<{ data: DailyProfit[] }>(`/api/bots/${botId.value}/profit-history`, {
    query: { days: 30 },
  })
  return response.data ?? []
}

// Fetch transaction history for AsyncDataTable
async function fetchTransactions (filters: AsyncDataTableFetchParams): Promise<AsyncDataTableFetchResult<WalletTransactionItem>> {
  const response = await request.get<{
    items: WalletTransactionItem[]
    pagination: { total: number }
  }>(`/api/bots/${botId.value}/transactions`, {
    query: filters,
  })
  return {
    items: response.items ?? [],
    total: response.pagination.total ?? 0,
  }
}
</script>

<template>
  <PageCard
    :title="T('title')"
    back
  >
    <BotInfoTable
      v-if="bot"
      :bot="bot"
    />

    <Message
      severity="warn"
      class="mx-4 mb-4"
    >
      {{ T('dataNotice', { date: formatDateTime(BOT_TRACKING_START_DATE) }) }}
    </Message>

    <AppTransactionHistory
      :fetchTransactions="fetchTransactions"
      :fetchProfitHistory="fetchProfitHistory"
    />
  </PageCard>
</template>
