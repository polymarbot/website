<script setup lang="ts">
import type { MenuItem } from '@packages/layer-basic/app/components/ui/Dropdown/index.vue'
import type { DataTableColumn } from '@packages/layer-basic/app/components/ui/DataTable/index.vue'
import type {
  AsyncDataTableFetchParams,
  AsyncDataTableFetchResult,
} from '@packages/layer-basic/app/components/ui/AsyncDataTable/index.vue'
import DetailModal from './components/DetailModal/index.vue'
import ImportModal from './components/ImportModal/index.vue'
import DepositModal from './components/DepositModal/index.vue'
import WithdrawModal from './components/WithdrawModal/index.vue'
import TransferModal from './components/TransferModal/index.vue'
import ExportModal from './components/ExportModal/index.vue'
import DeleteModal from './components/DeleteModal/index.vue'

definePageMeta({
  title: 'pages.wallets.name',
})

const T = useTranslations('pages.wallets')
const TC = useTranslations('common')
const { isMobile } = useDevice()
const request = useRequest()

// URL-synced filters
const filters = useFilters<{
  keyword: string
  status: string | null
}>({
  keyword: '',
  status: null,
})

const filtersModel = computed({
  get: () => filters,
  set: (v: Record<string, any>) => Object.assign(filters, v),
})

// Input keyword (not synced to URL until search is triggered)
const inputKeyword = ref(filters.keyword)

// DataTable ref
const dataTableRef = ref<{ fetchData: () => void, resetPagination: () => void } | null>(null)

// Modal states
const showDetailModal = ref(false)
const showImportModal = ref(false)
const showDepositModal = ref(false)
const showWithdrawModal = ref(false)
const showTransferModal = ref(false)
const showExportModal = ref(false)
const showDeleteModal = ref(false)

// Selected wallet for operations
const selectedWallet = ref<WalletItem | null>(null)

// Fetch wallets method for AsyncDataTable
async function fetchWallets (filters: AsyncDataTableFetchParams): Promise<AsyncDataTableFetchResult<WalletItem>> {
  const response = await request.get<{
    items: WalletItem[]
    pagination: {
      total: number
    }
  }>('/api/wallets', {
    query: filters,
  })
  return {
    items: response.items ?? [],
    total: response.pagination.total ?? 0,
  }
}

// Trigger search manually
function handleSearch () {
  filters.keyword = inputKeyword.value
  dataTableRef.value?.resetPagination()
}

// Open create modal
function openCreateModal () {
  selectedWallet.value = null
  showDetailModal.value = true
}

// Open edit modal
function openEditModal (wallet: WalletItem) {
  selectedWallet.value = wallet
  showDetailModal.value = true
}

// Open deposit modal
function openDepositModal (wallet: WalletItem) {
  selectedWallet.value = wallet
  showDepositModal.value = true
}

// Open withdraw modal
function openWithdrawModal (wallet: WalletItem) {
  selectedWallet.value = wallet
  showWithdrawModal.value = true
}

// Open transfer modal
function openTransferModal (wallet: WalletItem) {
  selectedWallet.value = wallet
  showTransferModal.value = true
}

// Open export modal
function openExportModal (wallet: WalletItem) {
  selectedWallet.value = wallet
  showExportModal.value = true
}

// Open delete modal
function openDeleteModal (wallet: WalletItem) {
  selectedWallet.value = wallet
  showDeleteModal.value = true
}

// Navigate to transaction history page
function navigateToTransactions (wallet: WalletItem) {
  navigateTo(`/wallets/${wallet.funder}/transactions`)
}

// Navigate to bots page filtered by wallet
function navigateToBots (wallet: WalletItem) {
  navigateTo({ path: '/bots', query: { funder: wallet.funder, back: 'true' }})
}

// Refresh wallet list after any data change
function refreshList () {
  request.invalidateCache('/api/wallets')
  dataTableRef.value?.fetchData()
}

// Get status badge severity
function getStatusSeverity (status: WalletStatusType) {
  return WalletStatusSeverityMap[status] ?? 'secondary'
}

// Generate dropdown menu items for a wallet
function getActionMenuItems (wallet: WalletItem): MenuItem[] {
  return [
    {
      label: TC('actions.edit'),
      icon: 'pi pi-pencil',
      command: () => openEditModal(wallet),
    },
    {
      label: T('actions.transactions'),
      icon: 'pi pi-receipt',
      command: () => navigateToTransactions(wallet),
    },
    {
      label: T('actions.viewBots'),
      icon: 'pi pi-android',
      command: () => navigateToBots(wallet),
    },
    {
      separator: true,
    },
    {
      label: TC('actions.deposit'),
      icon: 'pi pi-wallet',
      command: () => openDepositModal(wallet),
    },
    {
      label: TC('actions.withdraw'),
      icon: 'pi pi-money-bill',
      command: () => openWithdrawModal(wallet),
    },
    {
      label: TC('actions.transfer'),
      icon: 'pi pi-arrow-right-arrow-left',
      command: () => openTransferModal(wallet),
    },
    {
      label: TC('actions.export'),
      icon: 'pi pi-upload',
      command: () => openExportModal(wallet),
    },
    {
      separator: true,
    },
    {
      label: TC('actions.delete'),
      icon: 'pi pi-trash',
      class: 'text-danger',
      command: () => openDeleteModal(wallet),
    },
  ]
}

// Funder help tooltip with link
const funderHelpTooltip = computed(() => {
  const text = T('tooltips.funderHelp')
  const linkText = T('tooltips.funderHelpLink')
  const linkClass = 'text-info underline'
  const link = `<a href="https://docs.polymarket.com/developers/proxy-wallet" target="_blank" rel="noopener noreferrer" class="${linkClass}">${linkText}</a>`
  return `${text} ${link}`
})

// Table columns definition
const columns: DataTableColumn[] = [
  {
    field: 'name',
    title: T('table.name'),
  },
  {
    field: 'balance',
    title: T('table.balance'),
    type: 'currency',
  },
  {
    field: 'funder',
    title: T('table.funder'),
  },
  {
    field: 'botCount',
    title: T('table.botCount'),
  },
  {
    field: 'status',
    title: T('table.status'),
    filter: {
      options: [
        { label: T('status.INACTIVE'), value: WalletStatus.INACTIVE },
        { label: T('status.ACTIVE'), value: WalletStatus.ACTIVE },
        { label: T('status.DEPLOYING'), value: WalletStatus.DEPLOYING },
        { label: T('status.FAILED'), value: WalletStatus.FAILED },
      ],
    },
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
    field: 'actions',
    title: TC('labels.actions'),
    type: 'empty',
    fixed: 'right',
    width: '1%',
  },
]
</script>

<template>
  <PageCard>
    <template #title>
      <div class="flex items-center justify-between">
        <span>{{ T('name') }}</span>
        <div class="flex shrink-0 gap-2">
          <Button
            severity="secondary"
            outlined
            icon="pi pi-download"
            :size="isMobile ? 'small' : undefined"
            @click="showImportModal = true"
          >
            {{ T('actions.import') }}
          </Button>
          <Button
            icon="pi pi-plus"
            :size="isMobile ? 'small' : undefined"
            @click="openCreateModal"
          >
            {{ T('actions.create') }}
          </Button>
        </div>
      </div>
    </template>

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
        @click="handleSearch"
      >
        {{ TC('actions.search') }}
      </Button>
    </div>

    <!-- Wallets Table -->
    <AsyncDataTable
      ref="dataTableRef"
      v-model:filters="filtersModel"
      :columns="columns"
      :fetchMethod="fetchWallets"
      :tableProps="{ scrollable: true, scrollHeight: 'flex' }"
    >
      <template #header-funder>
        <div class="flex items-center gap-2">
          <span>{{ T('table.funder') }}</span>
          <Help
            :text="funderHelpTooltip"
            :tooltipOptions="{
              escape: false,
              autoHide: false,
            }"
          />
        </div>
      </template>

      <template #header-balance>
        <div class="flex items-center gap-2">
          <span>{{ T('table.balance') }}</span>
          <Help text="USDC.e">
            <IconUSDC :size="16" />
          </Help>
        </div>
      </template>

      <template #funder="{ row }">
        <AppAddressDisplay
          :address="row.funder"
          :href="getPolymarketProfileUrl(row.funder)"
          :tooltip="TC('labels.viewOnPolymarket')"
          copyable
        />
      </template>

      <template #status="{ row }">
        <Tooltip
          :text="row.status === WalletStatus.INACTIVE ? T('tooltips.inactive') : undefined"
        >
          <Tag
            :severity="getStatusSeverity(row.status)"
            :value="T(`status.${row.status}`)"
          />
        </Tooltip>
      </template>

      <template #actions="{ row }">
        <Dropdown
          :menus="getActionMenuItems(row)"
        >
          <Button
            severity="secondary"
            text
            size="small"
            icon="pi pi-ellipsis-h"
          />
        </Dropdown>
      </template>
    </AsyncDataTable>

    <!-- Create/Edit Wallet Modal -->
    <DetailModal
      v-model:visible="showDetailModal"
      :wallet="selectedWallet"
      @success="refreshList"
    />

    <!-- Import Wallet Modal -->
    <ImportModal
      v-model:visible="showImportModal"
      @success="refreshList"
    />

    <!-- Deposit Modal -->
    <DepositModal
      v-model:visible="showDepositModal"
      :wallet="selectedWallet"
    />

    <!-- Withdraw Modal -->
    <WithdrawModal
      v-model:visible="showWithdrawModal"
      :wallet="selectedWallet"
    />

    <!-- Transfer Modal -->
    <TransferModal
      v-model:visible="showTransferModal"
      :wallet="selectedWallet"
    />

    <!-- Export Modal -->
    <ExportModal
      v-model:visible="showExportModal"
      :wallet="selectedWallet"
    />

    <!-- Delete Confirmation Modal -->
    <DeleteModal
      v-model:visible="showDeleteModal"
      :wallet="selectedWallet"
      @success="refreshList"
    />
  </PageCard>
</template>
