<script setup lang="ts" generic="TData extends Record<string, any>">
import type { DataTableProps as PrimeDataTableProps } from 'primevue/datatable'
import type { MenuItem } from 'primevue/menuitem'
import type { DataTableColumn } from '~/components/ui/DataTable/index.vue'

export interface AsyncDataTableBatchAction<T = Record<string, any>> {
  label: string
  icon?: string
  class?: ClassValue
  disabled?: boolean
  action: (selectedItems: T[]) => void
}

export interface AsyncDataTablePagination {
  page: number
  size: number
  total: number
}

export interface AsyncDataTableFetchParams {
  offset: number
  limit: number
  /** Current filter values, keyed by filter field name */
  filters: Record<string, any>
}

export interface AsyncDataTableFetchResult<T = Record<string, any>> {
  items: T[]
  total: number
}

export interface AsyncDataTableProps<T = Record<string, any>> {
  /** Column definitions */
  columns?: DataTableColumn[]
  /** Async function to fetch data (auto mode). If not provided, uses static value mode */
  fetchMethod?: (params: AsyncDataTableFetchParams) => Promise<AsyncDataTableFetchResult<T>>
  /** Whether to auto fetch data on mount */
  autoFetch?: boolean
  /** Static data array (manual mode) */
  value?: T[]
  /** Initial filter values for initialization only */
  defaultFilters?: Record<string, any>
  /** Whether to show top toolbar (undefined = auto when page size >= 50) */
  showTopToolbar?: boolean
  /** Whether to show bottom toolbar */
  showBottomToolbar?: boolean
  /** Available page size options */
  pageSizeOptions?: number[]
  /** Whether to show pagination controls */
  showPagination?: boolean
  /** Whether rows are selectable */
  selectable?: boolean
  /** Batch action definitions for selected rows */
  batchActions?: AsyncDataTableBatchAction<T>[]
  /** Pass-through props to DataTable */
  tableProps?: Omit<PrimeDataTableProps, 'value' | 'selection'>
}

export interface AsyncDataTableSlotProps<T = Record<string, any>> {
  column: DataTableColumn
  row: T
  value: unknown
  index: number
}

const props = withDefaults(defineProps<AsyncDataTableProps<TData>>(), {
  columns: () => [],
  fetchMethod: undefined,
  autoFetch: true,
  value: () => [],
  defaultFilters: () => ({}),
  showTopToolbar: undefined,
  showBottomToolbar: true,
  pageSizeOptions: () => [ 10, 20, 50, 100 ],
  showPagination: true,
  selectable: false,
  batchActions: () => [],
  tableProps: undefined,
})

const emit = defineEmits<{
  /** Emitted when filters change */
  filter: [filters: Record<string, any>]
}>()

const selection = defineModel<TData[]>('selection', { default: () => []})

const T = useTranslations('components.ui.AsyncDataTable')

const { isMobile } = useDevice()
const loading = ref(false)
const internalData = ref<TData[]>([]) as Ref<TData[]>
const pagination = ref<AsyncDataTablePagination>({
  page: 1,
  size: props.pageSizeOptions[0] || 10,
  total: 0,
})
const requestVersion = ref(0) // Track request version to handle race conditions

const filterValues = ref<Record<string, any>>({ ...props.defaultFilters })

const useFetchMode = computed(() => !!props.fetchMethod)
const tableData = computed(() => useFetchMode.value ? internalData.value : props.value)

const hasPagination = computed(() => useFetchMode.value || pagination.value.total > 0)
const paginationFirst = computed(() => (pagination.value.page - 1) * pagination.value.size)

// Page report template: mobile shows simplified total count, desktop shows full range
const pageReportTemplate = computed(() => {
  if (!props.showPagination) return ''
  return isMobile.value ? T('pageReportMobile') : T('pageReport')
})

// Mobile optimized pagination template (includes CurrentPageReport for total count)
const paginationTemplate = computed(() =>
  isMobile.value
    ? 'CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink'
    : 'CurrentPageReport FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown',
)

// Control number of page links displayed
const pageLinkSize = computed(() => isMobile.value ? 1 : 5)

// When showTopToolbar is undefined, auto-show when page size >= 50
const shouldShowTopToolbar = computed(() => {
  if (props.showTopToolbar !== undefined) {
    return props.showTopToolbar
  }
  return pagination.value.size >= 50
})

const shouldShowBottomToolbar = computed(() => props.showBottomToolbar)

const showSelectionColumn = computed(() => props.selectable || props.batchActions.length > 0)
const selectedCount = computed(() => selection.value?.length ?? 0)

const batchActionButtonSize = computed(() => isMobile.value ? 'small' : undefined)
const hasBatchActions = computed(() => props.batchActions.length > 0)
const batchActionsDisabled = computed(() => !selection.value || selection.value.length === 0)

const batchMenuItems = computed<MenuItem[]>(() =>
  props.batchActions.map(action => ({
    label: action.label,
    icon: action.icon,
    class: action.class,
    disabled: action.disabled || batchActionsDisabled.value,
    command: () => action.action(selection.value ?? []),
  })),
)

async function fetchData (page?: number, forceRefresh = false) {
  if (!props.fetchMethod) return

  // Skip if already loading (unless force refresh)
  if (loading.value && !forceRefresh) return

  // Increment version to invalidate any in-flight requests
  const currentVersion = ++requestVersion.value

  if (page !== undefined) {
    pagination.value.page = page
  }

  const { size } = pagination.value
  const offset = (pagination.value.page - 1) * size

  loading.value = true
  try {
    const result = await props.fetchMethod({
      offset,
      limit: size,
      filters: getFilters(),
    })

    // Ignore result if a newer request was initiated
    if (currentVersion !== requestVersion.value) return

    internalData.value = result.items as TData[]
    pagination.value.total = result.total
  } catch (error) {
    // Ignore error if a newer request was initiated
    if (currentVersion !== requestVersion.value) return
    console.error('AsyncDataTable fetchData failed:', error)
  } finally {
    // Only update loading state if this is the latest request
    if (currentVersion === requestVersion.value) {
      loading.value = false
    }
  }
}

function resetPagination () {
  pagination.value.page = 1
  pagination.value.total = 0
  fetchData(undefined, true) // Force refresh to bypass loading check
}

function onPageChange (event: { page: number, rows: number, first: number }) {
  const newPage = event.page + 1
  const newSize = event.rows

  if (newPage === pagination.value.page && newSize === pagination.value.size) {
    return
  }

  pagination.value.page = newPage
  pagination.value.size = newSize

  if (useFetchMode.value) {
    fetchData()
  }
}

function getFilters (): Record<string, any> {
  return { ...filterValues.value }
}

function handleFilterChange (field: string, value: any) {
  const currentValue = filterValues.value[field] ?? null
  if (currentValue === value) return

  filterValues.value[field] = value
  emit('filter', getFilters())
  resetPagination()
}

defineExpose({
  fetchData,
  resetPagination,
})

onMounted(() => {
  if (useFetchMode.value && props.autoFetch) {
    fetchData()
  }
})
</script>

<template>
  <div>
    <!-- Top toolbar -->
    <div
      v-if="shouldShowTopToolbar && (!!$slots.toolbar || hasBatchActions || hasPagination)"
      class="mb-4 flex items-center justify-between gap-4"
    >
      <div class="flex items-center gap-2">
        <Dropdown
          v-if="hasBatchActions"
          :menus="batchMenuItems"
          trigger="click"
        >
          <Button
            :size="batchActionButtonSize"
            severity="secondary"
            outlined
            icon="pi pi-chevron-down"
            iconPos="right"
            :disabled="batchActionsDisabled"
          >
            {{ T('actions') }} ({{ selectedCount }})
          </Button>
        </Dropdown>

        <slot name="toolbar" />
      </div>

      <PrimePaginator
        v-if="hasPagination"
        :first="paginationFirst"
        :rows="pagination.size"
        :totalRecords="pagination.total"
        :rowsPerPageOptions="pageSizeOptions"
        :pageLinkSize="pageLinkSize"
        :template="{
          default: paginationTemplate,
        }"
        :currentPageReportTemplate="pageReportTemplate"
        :pt="{ root: { class: 'p-0' }}"
        @page="onPageChange"
      />
    </div>

    <!-- Data Table -->
    <DataTable
      v-model:selection="selection"
      v-bind="tableProps"
      :columns="columns"
      :value="tableData"
      :loading="loading"
      :selectionMode="showSelectionColumn ? 'multiple' : undefined"
      :filterValues="filterValues"
      @filterChange="handleFilterChange"
    >
      <template
        v-for="name in Object.keys($slots).filter(name => name !== 'toolbar')"
        :key="name"
        #[name]="slotData"
      >
        <slot
          :name="name"
          v-bind="slotData ?? {}"
        />
      </template>
    </DataTable>

    <!-- Bottom toolbar -->
    <div
      v-if="shouldShowBottomToolbar && (!!$slots.toolbar || hasBatchActions || hasPagination)"
      class="mt-4 flex items-center justify-between gap-4"
    >
      <div class="flex items-center gap-2">
        <Dropdown
          v-if="hasBatchActions"
          :menus="batchMenuItems"
          trigger="click"
        >
          <Button
            :size="batchActionButtonSize"
            severity="secondary"
            outlined
            icon="pi pi-chevron-down"
            iconPos="right"
            :disabled="batchActionsDisabled"
          >
            {{ T('actions') }} ({{ selectedCount }})
          </Button>
        </Dropdown>

        <slot name="toolbar" />
      </div>

      <PrimePaginator
        v-if="hasPagination"
        :first="paginationFirst"
        :rows="pagination.size"
        :totalRecords="pagination.total"
        :rowsPerPageOptions="pageSizeOptions"
        :pageLinkSize="pageLinkSize"
        :template="{
          default: paginationTemplate,
        }"
        :currentPageReportTemplate="pageReportTemplate"
        :pt="{ root: { class: 'p-0' }}"
        @page="onPageChange"
      />
    </div>
  </div>
</template>
