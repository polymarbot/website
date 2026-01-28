<script setup lang="ts">
import type { MenuItem } from '~/components/ui/Menu.vue'
import type { DataTableColumn } from '~/components/ui/DataTable/index.vue'
import type {
  AsyncDataTableFetchParams,
  AsyncDataTableFetchResult,
  AsyncDataTableBatchAction,
} from '~/components/ui/AsyncDataTable/index.vue'
import { useBatchBotOperations } from './composables/useBatchBotOperations'
import BatchBotOperations from './components/BatchBotOperations/index.vue'
import CreateModal from './components/CreateModal/index.vue'
import InsufficientBalanceMessage from './components/InsufficientBalanceMessage/index.vue'
import AppWalletSelect from '~/components/app/WalletSelect/index.vue'
import AppStrategySelect from '~/components/app/StrategySelect/index.vue'
import { getIntervalLabel } from '~/components/app/MarketIntervalSelect/utils'

definePageMeta({
  layout: 'app',
  title: 'pages.app.bots.name',
})

const T = useTranslations('pages.app.bots')
const TC = useTranslations('common')
const { isMobile } = useDevice()
const request = useRequest()
const toast = useToast()
const dialog = useDialog()
const { formatDuration } = useDate()

// URL-synced filters (comma-separated strings)
const filters = useFilters<{
  symbols: string
  intervals: string
  keyword: string
  funder: string | null
  strategyId: string | null
}>({
  symbols: '',
  intervals: '',
  keyword: '',
  funder: null,
  strategyId: null,
})

// Input keyword (not synced to URL until search is triggered)
const inputKeyword = ref(filters.keyword)

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

// DataTable ref
const dataTableRef = ref<{ fetchData: () => void, resetPagination: () => void } | null>(null)

// Modal states
const showCreateModal = ref(false)

// Loading states for enable/disable operations (tracked by bot id)
const enablingBots = ref<Set<string>>(new Set())
const disablingBots = ref<Set<string>>(new Set())

// Use batch operations composable for batch enable/disable/delete
const {
  execute: executeBatchOperation,
  isEnabling: isBatchEnabling,
  isDisabling: isBatchDisabling,
  isDeleting: isBatchDeleting,
} = useBatchBotOperations()

// Selected bots for batch operations
const selectedBots = ref<BotItem[]>([])

// Compute selected bots status
const hasEnabledBots = computed(() => selectedBots.value.some(bot => bot.enabled))
const hasDisabledBots = computed(() => selectedBots.value.some(bot => !bot.enabled))

// Get display name for symbol
function getSymbolName (symbol: MarketSymbolType) {
  return symbol.toUpperCase()
}

// Trigger search manually
function handleSearch () {
  filters.keyword = inputKeyword.value
  dataTableRef.value?.resetPagination()
}

// Fetch bots method for AsyncDataTable
async function fetchBots ({ offset, limit }: AsyncDataTableFetchParams): Promise<AsyncDataTableFetchResult<BotItem>> {
  const response = await request.get<{
    items: BotItem[]
    pagination: { total: number }
  }>('/api/bots', {
    query: {
      offset,
      limit,
      keyword: filters.keyword || undefined,
      symbols: selectedSymbols.value.length > 0 ? selectedSymbols.value.join(',') : undefined,
      intervals: selectedIntervals.value.length > 0 ? selectedIntervals.value.join(',') : undefined,
      funder: filters.funder || undefined,
      strategyId: filters.strategyId || undefined,
    },
  })
  return {
    items: response.items ?? [],
    total: response.pagination.total ?? 0,
  }
}

// Watch filters and auto-reload data when symbols or intervals change
watch([ () => filters.symbols, () => filters.intervals ], () => {
  dataTableRef.value?.resetPagination()
})

// Open create modal
function openCreateModal () {
  showCreateModal.value = true
}

// Handle bot created
function onBotCreated () {
  showCreateModal.value = false
  dataTableRef.value?.fetchData()
}

// Handle batch operations success
function onBatchOperationSuccess () {
  dataTableRef.value?.fetchData()
}

// Enable bot
async function handleEnable (bot: BotItem) {
  // Show confirmation dialog
  const confirmed = await dialog.confirm({
    type: 'warn',
    header: T('modals.enable.title'),
    message: T('modals.enable.message'),
  })
  if (!confirmed) return

  enablingBots.value.add(bot.id)
  try {
    const result = await request.post<{ walletActivating?: boolean }>(
      `/api/bots/${bot.id}/enable`,
      {},
      {
        customErrorMessage: error => {
          // Handle insufficient balance error with detailed info
          const errorData = error.data?.data as { code?: string, details?: unknown } | undefined
          if (errorData?.code === 'BOT_WALLET_INSUFFICIENT_BALANCE' && errorData?.details) {
            const details = errorData.details as {
              currentBalance: string
              requiredBalance: string
              shortfall: string
            }
            return h(InsufficientBalanceMessage, {
              currentBalance: details.currentBalance,
              requiredBalance: details.requiredBalance,
              shortfall: details.shortfall,
            })
          }
        },
      },
    )
    if (result.walletActivating) {
      toast.info(T('messages.walletActivating'))
    } else {
      toast.success(T('messages.enableSuccess'))
    }
    dataTableRef.value?.fetchData()
  } catch (err) {
    console.error('Failed to enable bot:', err)
  } finally {
    enablingBots.value.delete(bot.id)
  }
}

// Disable bot
async function handleDisable (bot: BotItem) {
  // Show confirmation dialog
  const confirmed = await dialog.confirm({
    type: 'warn',
    header: T('modals.disable.title'),
    message: T('modals.disable.message'),
  })
  if (!confirmed) return

  disablingBots.value.add(bot.id)
  try {
    await request.post(`/api/bots/${bot.id}/disable`)
    toast.success(T('messages.disableSuccess'))
    dataTableRef.value?.fetchData()
  } catch (err) {
    console.error('Failed to disable bot:', err)
  } finally {
    disablingBots.value.delete(bot.id)
  }
}

// Delete bot
async function handleDelete (bot: BotItem) {
  // Show confirmation dialog
  const confirmed = await dialog.confirm({
    type: 'warn',
    header: T('modals.delete.title'),
    message: T('modals.delete.message'),
  })
  if (!confirmed) return

  try {
    await request.delete(`/api/bots/${bot.id}`)
    toast.success(T('messages.deleteSuccess'))
    dataTableRef.value?.fetchData()
  } catch (err) {
    console.error('Failed to delete bot:', err)
  }
}

// Get wallet status severity
function getWalletStatusSeverity (status: WalletStatusType) {
  return WalletStatusSeverityMap[status] ?? 'secondary'
}

// Get bot runtime including current running time
function getBotRuntime (bot: BotItem): string {
  let totalSeconds = bot.totalRuntimeSeconds

  // Add current running time if bot is enabled
  if (bot.enabled && bot.enabledAt) {
    const enabledAt = new Date(bot.enabledAt).getTime()
    const now = Date.now()
    const currentRunningSeconds = Math.floor((now - enabledAt) / 1000)
    totalSeconds += currentRunningSeconds
  }

  return formatDuration(totalSeconds)
}

// Check if bot can be deleted
function canDelete (bot: BotItem) {
  return !bot.enabled && bot.wallet.status !== WalletStatus.DEPLOYING
}

// Navigate to run history page
function viewRunHistory (bot: BotItem) {
  navigateTo(`/app/bots/${bot.id}/operation-history`)
}

// Generate dropdown menu items for a bot
function getActionMenuItems (bot: BotItem): MenuItem[] {
  const items: MenuItem[] = []

  // View run history is always available
  items.push({
    label: T('actions.viewRunHistory'),
    icon: 'pi pi-history',
    command: () => viewRunHistory(bot),
  })

  if (canDelete(bot)) {
    items.push({
      separator: true,
    })
    items.push({
      label: TC('actions.delete'),
      icon: 'pi pi-trash',
      class: 'text-danger',
      command: () => handleDelete(bot),
    })
  }

  return items
}

// Batch enable selected bots
async function handleBatchEnable (bots: BotItem[]) {
  // Show custom confirmation dialog with count
  const confirmed = await dialog.confirm({
    type: 'warn',
    header: T('modals.batchEnable.title'),
    message: T('modals.batchEnable.message', { count: bots.length }),
  })
  if (!confirmed) return

  // Use composable's execute function, skip its confirmation since we showed custom one
  await executeBatchOperation('enable', {
    ids: bots.map(bot => bot.id),
  }, () => {
    selectedBots.value = []
    dataTableRef.value?.fetchData()
  }, true)
}

// Batch disable selected bots
async function handleBatchDisable (bots: BotItem[]) {
  // Show custom confirmation dialog with count
  const confirmed = await dialog.confirm({
    type: 'warn',
    header: T('modals.batchDisable.title'),
    message: T('modals.batchDisable.message', { count: bots.length }),
  })
  if (!confirmed) return

  // Use composable's execute function, skip its confirmation since we showed custom one
  await executeBatchOperation('disable', {
    ids: bots.map(bot => bot.id),
  }, () => {
    selectedBots.value = []
    dataTableRef.value?.fetchData()
  }, true)
}

// Batch delete selected bots
async function handleBatchDelete (bots: BotItem[]) {
  // Show custom confirmation dialog with count
  const confirmed = await dialog.confirm({
    type: 'warn',
    header: T('modals.batchDelete.title'),
    message: T('modals.batchDelete.message', { count: bots.length }),
  })
  if (!confirmed) return

  // Use composable's execute function, skip its confirmation since we showed custom one
  await executeBatchOperation('delete', {
    ids: bots.map(bot => bot.id),
  }, () => {
    selectedBots.value = []
    dataTableRef.value?.fetchData()
  }, true)
}

// Batch actions configuration
const batchActions = computed<AsyncDataTableBatchAction<BotItem>[]>(() => {
  const isExecuting = isBatchEnabling.value || isBatchDisabling.value || isBatchDeleting.value

  return [
    {
      label: T('actions.batchEnable'),
      icon: 'pi pi-play-circle text-success',
      disabled: isExecuting || !hasDisabledBots.value,
      action: handleBatchEnable,
    },
    {
      label: T('actions.batchDisable'),
      icon: 'pi pi-stop-circle text-danger',
      disabled: isExecuting || !hasEnabledBots.value,
      action: handleBatchDisable,
    },
    {
      label: T('actions.batchDelete'),
      icon: 'pi pi-trash text-danger',
      disabled: isExecuting || !hasDisabledBots.value,
      action: handleBatchDelete,
    },
  ]
})

// Handle filter change from DataTable
function handleFilterChange (tableFilters: Record<string, any>) {
  Object.assign(filters, tableFilters)
}

// Table columns definition
const columns: DataTableColumn[] = [
  {
    field: 'market',
    title: T('table.market'),
  },
  {
    field: 'wallet',
    title: T('table.wallet'),
    filter: {
      field: 'funder',
      component: AppWalletSelect,
    },
  },
  {
    field: 'strategy',
    title: T('table.strategy'),
    filter: {
      field: 'strategyId',
      component: AppStrategySelect,
    },
  },
  {
    field: 'runtime',
    title: T('table.runtime'),
  },
  {
    field: 'createdAt',
    title: TC('labels.createdAt'),
    type: 'date',
  },
  {
    field: 'updatedAt',
    title: TC('labels.updatedAt'),
    type: 'date',
  },
  {
    field: 'status',
    title: T('table.status'),
    type: 'empty',
    align: 'center',
    fixed: 'right',
    width: '1%',
  },
  {
    field: 'actions',
    title: TC('labels.actions'),
    type: 'empty',
    align: 'center',
    fixed: 'right',
    width: '1%',
  },
]
</script>

<template>
  <PageCard>
    <template #title>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span>{{ T('name') }}</span>
        <div class="flex items-center gap-2">
          <BatchBotOperations @success="onBatchOperationSuccess" />
          <Button
            icon="pi pi-plus"
            :size="isMobile ? 'small' : undefined"
            :label="T('actions.create')"
            @click="openCreateModal"
          />
        </div>
      </div>
    </template>

    <!-- Filters -->
    <div class="mb-6">
      <AppStrategyFilters
        v-model:symbols="selectedSymbols"
        v-model:intervals="selectedIntervals"
        :showIntervalMinutes="false"
      />
    </div>

    <!-- Search -->
    <div class="mb-4 flex gap-2">
      <Input
        v-model="inputKeyword"
        :placeholder="T('searchPlaceholder')"
        class="
          flex-1
          sm:w-100 sm:flex-initial
        "
        @keyup.enter="handleSearch"
      />
      <Button
        severity="secondary"
        outlined
        icon="pi pi-search"
        class="shrink-0"
        :size="isMobile ? 'small' : undefined"
        @click="handleSearch"
      >
        {{ TC('actions.search') }}
      </Button>
    </div>

    <!-- Bots Table -->
    <AsyncDataTable
      ref="dataTableRef"
      v-model:selection="selectedBots"
      :columns="columns"
      :fetchMethod="fetchBots"
      :batchActions="batchActions"
      :defaultFilters="filters"
      :tableProps="{ scrollable: true, scrollHeight: 'flex' }"
      @filter="handleFilterChange"
    >
      <!-- Market column -->
      <template #market="{ row }">
        <div class="flex w-max items-center gap-2">
          <img
            :src="getSymbolImage(row.symbol)"
            :alt="getSymbolName(row.symbol)"
            class="size-6 rounded-full"
          >
          <div>
            <p class="font-medium">
              {{ getSymbolName(row.symbol) }}
            </p>
            <p class="text-xs text-muted-color">
              {{ getIntervalLabel(row.interval) }}
            </p>
          </div>
        </div>
      </template>

      <!-- Wallet column -->
      <template #wallet="{ row }">
        <div class="flex items-center gap-2">
          <AppAddressDisplay
            :name="row.wallet.name"
            :address="row.funder"
            :balance="row.wallet.balance"
          />
          <Tooltip
            v-if="row.wallet.status === WalletStatus.DEPLOYING"
            :text="T('tooltips.walletDeploying')"
          >
            <Tag
              :severity="getWalletStatusSeverity(row.wallet.status)"
              size="small"
            >
              {{ T('walletStatus.DEPLOYING') }}
            </Tag>
          </Tooltip>
          <Tooltip
            v-else-if="row.wallet.status === WalletStatus.FAILED"
            :text="T('tooltips.walletFailed')"
          >
            <Tag
              :severity="getWalletStatusSeverity(row.wallet.status)"
              size="small"
            >
              {{ T('walletStatus.FAILED') }}
            </Tag>
          </Tooltip>
        </div>
      </template>

      <!-- Strategy column -->
      <template #strategy="{ row }">
        <AppStrategyDisplay
          :name="row.strategy.name"
          :amount="row.strategy.amount"
          :strategyId="row.strategyId"
          :strategyJson="row.strategy.strategyJson"
          :interval="row.interval"
          :symbols="row.symbol"
          showStats
        />
      </template>

      <!-- Runtime column -->
      <template #runtime="{ row }">
        {{ getBotRuntime(row) }}
      </template>

      <!-- Status column -->
      <template #status="{ row }">
        <!-- Disabling state: show spinner -->
        <Tooltip
          v-if="disablingBots.has(row.id)"
          :text="T('tooltips.disabling')"
        >
          <Button
            severity="danger"
            text
            size="small"
            disabled
          >
            <i class="pi pi-spin pi-spinner" />
          </Button>
        </Tooltip>
        <!-- Enabled: show play icon, hover to show stop icon -->
        <Tooltip
          v-else-if="row.enabled"
          :text="T('tooltips.disable')"
        >
          <Button
            severity="danger"
            text
            size="small"
            class="group"
            @click="handleDisable(row)"
          >
            <i
              class="
                pi pi-play-circle text-success
                group-hover:!hidden
              "
            />
            <i
              class="
                pi pi-stop-circle !hidden
                group-hover:!inline
              "
            />
          </Button>
        </Tooltip>
        <!-- Enabling state: show spinner with success color -->
        <Tooltip
          v-else-if="enablingBots.has(row.id)"
          :text="T('tooltips.enabling')"
        >
          <Button
            severity="success"
            text
            size="small"
            disabled
          >
            <i class="pi pi-spin pi-spinner" />
          </Button>
        </Tooltip>
        <!-- Wallet deploying: show clock icon -->
        <Tooltip
          v-else-if="row.wallet.status === WalletStatus.DEPLOYING"
          :text="T('tooltips.walletDeploying')"
        >
          <Button
            severity="warn"
            text
            size="small"
            disabled
          >
            <i class="pi pi-clock" />
          </Button>
        </Tooltip>
        <!-- Disabled: show pause icon, hover to show play icon -->
        <Tooltip
          v-else
          :text="T('tooltips.enable')"
        >
          <Button
            severity="success"
            text
            size="small"
            class="group"
            @click="handleEnable(row)"
          >
            <i
              class="
                pi pi-pause-circle text-muted-color
                group-hover:!hidden
              "
            />
            <i
              class="
                pi pi-play-circle !hidden
                group-hover:!inline
              "
            />
          </Button>
        </Tooltip>
      </template>

      <!-- Actions column -->
      <template #actions="{ row }">
        <Dropdown :menus="getActionMenuItems(row)">
          <Button
            severity="secondary"
            text
            size="small"
            icon="pi pi-ellipsis-h"
          />
        </Dropdown>
      </template>
    </AsyncDataTable>

    <!-- Create Bot Modal -->
    <CreateModal
      v-model:visible="showCreateModal"
      @success="onBotCreated"
    />
  </PageCard>
</template>
