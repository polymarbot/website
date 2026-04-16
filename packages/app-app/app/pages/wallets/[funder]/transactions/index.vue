<script setup lang="ts">
import type {
  AsyncDataTableFetchParams,
  AsyncDataTableFetchResult,
} from '@packages/layer-basic/app/components/ui/AsyncDataTable/index.vue'

definePageMeta({
  title: 'pages.wallets._funder_.transactions.title',
})

const route = useRoute()
const T = useTranslations('pages.wallets._funder_.transactions')
const TC = useTranslations('common')
const request = useRequest()

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

// Fetch profit history
async function fetchProfitHistory (): Promise<DailyProfit[]> {
  const response = await request.get<{ data: DailyProfit[] }>(`/api/wallets/${funderAddress.value}/profit-history`, {
    query: { days: 30 },
  })
  return response.data ?? []
}

// Fetch transaction history for AsyncDataTable
async function fetchTransactions (filters: AsyncDataTableFetchParams): Promise<AsyncDataTableFetchResult<WalletTransactionItem>> {
  const response = await request.get<{
    items: WalletTransactionItem[]
    pagination: { total: number }
  }>(`/api/wallets/${funderAddress.value}/transactions`, {
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
    <template #subtitle>
      <div class="flex items-center gap-2">
        <AppAddressDisplay
          class="flex-wrap"
          :name="wallet?.name"
          :address="funderAddress"
          :balance="wallet?.balance"
          :href="getPolymarketProfileUrl(funderAddress)"
          :tooltip="TC('labels.viewOnPolymarket')"
          copyable
        />
      </div>
    </template>

    <AppTransactionHistory
      :fetchTransactions="fetchTransactions"
      :fetchProfitHistory="fetchProfitHistory"
      showBotId
    />
  </PageCard>
</template>
