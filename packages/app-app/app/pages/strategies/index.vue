<script setup lang="ts">
import type { MenuItem } from '@packages/layer-basic/app/components/ui/Dropdown/index.vue'
import type { DataTableColumn } from '@packages/layer-basic/app/components/ui/DataTable/index.vue'
import type {
  AsyncDataTableFetchParams,
  AsyncDataTableFetchResult,
} from '@packages/layer-basic/app/components/ui/AsyncDataTable/index.vue'
import DeleteModal from './components/DeleteModal.vue'
import { getIntervalLabelWithMinutes as formatIntervalWithMinutes } from '~/components/app/MarketIntervalSelect/utils'

definePageMeta({
  title: 'pages.strategies.name',
})

const { t } = useI18n()
const T = useTranslations('pages.strategies')
const TC = useTranslations('common')
const { isMobile } = useDevice()
const request = useRequest()

// URL-synced filters
const filters = useFilters<{
  keyword: string
  interval: string | null
}>({
  keyword: '',
  interval: null,
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
const showDeleteModal = ref(false)

// Selected strategy for operations
const selectedStrategy = ref<StrategyItem | null>(null)

// Fetch strategies method for AsyncDataTable
async function fetchStrategies (filters: AsyncDataTableFetchParams): Promise<AsyncDataTableFetchResult<StrategyItem>> {
  const response = await request.get<{
    items: StrategyItem[]
    pagination: {
      total: number
    }
  }>('/api/strategies', {
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

// Navigate to create page
function navigateToCreate () {
  navigateTo('/strategies/new')
}

// Navigate to duplicate page
function navigateToDuplicate (strategy: StrategyItem) {
  navigateTo(`/strategies/new?strategyId=${strategy.id}`)
}

// Navigate to detail page
function navigateToDetail (strategy: StrategyItem) {
  navigateTo(`/strategies/${strategy.id}`)
}

// Navigate to bots page filtered by strategy
function navigateToBots (strategy: StrategyItem) {
  navigateTo({ path: '/bots', query: { strategyId: strategy.id, back: 'true' }})
}

// Open delete modal
function openDeleteModal (strategy: StrategyItem) {
  selectedStrategy.value = strategy
  showDeleteModal.value = true
}

// Handle strategy deleted
function onStrategyDeleted () {
  showDeleteModal.value = false
  request.invalidateCache('/api/strategies')
  dataTableRef.value?.fetchData()
}

// Generate dropdown menu items for a strategy
function getActionMenuItems (strategy: StrategyItem): MenuItem[] {
  return [
    {
      label: TC('actions.edit'),
      icon: 'pi pi-pencil',
      command: () => navigateToDetail(strategy),
    },
    {
      label: TC('actions.duplicate'),
      icon: 'pi pi-copy',
      command: () => navigateToDuplicate(strategy),
    },
    {
      label: T('actions.viewBots'),
      icon: 'pi pi-android',
      command: () => navigateToBots(strategy),
    },
    {
      separator: true,
    },
    {
      label: TC('actions.delete'),
      icon: 'pi pi-trash',
      class: 'text-danger',
      command: () => openDeleteModal(strategy),
    },
  ]
}

// Table columns definition
const columns: DataTableColumn[] = [
  {
    field: 'name',
    title: T('table.name'),
  },
  {
    field: 'maxBuySize',
    title: T('table.maxBuySize'),
  },
  {
    field: 'amount',
    title: T('table.amount'),
    type: 'currency',
  },
  {
    field: 'interval',
    title: T('table.interval'),
    filter: {
      options: [
        { label: formatIntervalWithMinutes(MarketInterval.M5), value: MarketInterval.M5 },
        { label: formatIntervalWithMinutes(MarketInterval.M15), value: MarketInterval.M15 },
        { label: formatIntervalWithMinutes(MarketInterval.H1), value: MarketInterval.H1 },
        { label: formatIntervalWithMinutes(MarketInterval.H4), value: MarketInterval.H4 },
        { label: formatIntervalWithMinutes(MarketInterval.D1), value: MarketInterval.D1 },
      ],
    },
  },
  {
    field: 'botCount',
    title: T('table.botCount'),
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
            icon="pi pi-plus"
            :size="isMobile ? 'small' : undefined"
            @click="navigateToCreate"
          >
            {{ T('actions.create') }}
          </Button>
        </div>
      </div>
    </template>

    <!-- Hint: Guide to Rankings -->
    <Message
      severity="info"
      class="mb-4"
    >
      <i18n-t
        keypath="pages.strategies.hint.text"
        tag="span"
      >
        <template #link>
          <WebLink href="/rankings">
            {{ t('pages.rankings.title') }}
          </WebLink>
        </template>
      </i18n-t>
    </Message>

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

    <!-- Strategies Table -->
    <AsyncDataTable
      ref="dataTableRef"
      v-model:filters="filtersModel"
      :columns="columns"
      :fetchMethod="fetchStrategies"
      :tableProps="{ scrollable: true, scrollHeight: 'flex' }"
    >
      <template #name="{ row }">
        <AppStrategyDisplay
          :name="row.name"
          :strategyId="row.id"
          :strategyJson="row.strategyJson"
          :interval="row.interval"
          showStats
        />
      </template>

      <template #interval="{ row }">
        <Tag
          severity="secondary"
          :value="formatIntervalWithMinutes(row.interval)"
        />
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

    <!-- Delete Confirmation Modal -->
    <DeleteModal
      v-if="selectedStrategy"
      v-model:visible="showDeleteModal"
      :strategy="selectedStrategy"
      @success="onStrategyDeleted"
    />
  </PageCard>
</template>
