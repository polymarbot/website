<script setup lang="ts" generic="TData extends Record<string, any>">
import type { DataTableProps as PrimeDataTableProps } from 'primevue/datatable'
import type { MenuItem } from 'primevue/menuitem'
import type { DataTableColumn } from '@packages/layer-basic/app/components/ui/DataTable/index.vue'

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
  [key: string]: any
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
  /** External filter state (reactive, read directly) */
  filters?: Record<string, any>
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
  filters: undefined,
  showTopToolbar: undefined,
  showBottomToolbar: true,
  pageSizeOptions: () => [ 10, 20, 50, 100 ],
  showPagination: true,
  selectable: false,
  batchActions: () => [],
  tableProps: undefined,
})

const emit = defineEmits<{
  /** Emitted when filter values change */
  'update:filters': [filters: Record<string, any>]
}>()

const selection = defineModel<TData[]>('selection', { default: () => []})

const T = useTranslations('components.ui.AsyncDataTable')

const { isMobile } = useDevice()
const route = useRoute()
const loading = ref(false)
const internalData = ref<TData[]>([]) as Ref<TData[]>
const pagination = ref<AsyncDataTablePagination>({
  page: Number(props.filters?.page ?? route.query.page) || 1,
  size: Number(props.filters?.size ?? route.query.size) || props.pageSizeOptions[0] || 10,
  total: 0,
})
const requestVersion = ref(0) // Track request version to handle race conditions
const initSortBy = props.filters?.sortBy ?? route.query.sortBy
const initSortOrder = props.filters?.sortOrder ?? route.query.sortOrder
const sortState = ref<{ sortBy: string | null, sortOrder: number | null }>({
  sortBy: initSortBy ? String(initSortBy) : null,
  sortOrder: initSortOrder ? Number(initSortOrder) : null,
})

const useFetchMode = computed(() => !!props.fetchMethod)
const tableData = computed(() => useFetchMode.value ? internalData.value : props.value)

// Merge external filters with internal sort state for DataTable
const dataTableFilters = computed<Record<string, any>>(() => ({
  ...(props.filters ?? {}),
  sortBy: sortState.value.sortBy,
  sortOrder: sortState.value.sortOrder,
}))

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

  loading.value = true
  try {
    const result = await props.fetchMethod(filtersToFetchParams(getFilters()))

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

function resetPagination (overrides?: Record<string, any>) {
  pagination.value.page = 1
  pagination.value.total = 0
  emit('update:filters', getFilters(overrides))
  fetchData(undefined, true) // Force refresh to bypass loading check
}

function onPageChange (event: { page: number, rows: number }) {
  const newPage = event.page + 1
  const newSize = event.rows

  if (newPage === pagination.value.page && newSize === pagination.value.size) {
    return
  }

  pagination.value.page = newPage
  pagination.value.size = newSize
  emit('update:filters', getFilters())
  fetchData()
}

function getFilters (overrides?: Record<string, any>): Record<string, any> {
  return {
    ...(props.filters ?? {}),
    ...overrides,
    page: pagination.value.page,
    size: pagination.value.size,
    sortBy: sortState.value.sortBy,
    sortOrder: sortState.value.sortOrder,
  }
}

function filtersToFetchParams (filters: Record<string, any>): AsyncDataTableFetchParams {
  const { page, size, ...rest } = filters
  return {
    offset: (Number(page) - 1) * Number(size),
    limit: Number(size),
    ...rest,
  }
}

function onFiltersUpdate (newFilters: Record<string, any>) {
  // Skip if no actual changes
  const current = dataTableFilters.value
  const hasChanges = Object.keys(newFilters).some(key => newFilters[key] !== current[key])
  if (!hasChanges) return

  const { sortBy, sortOrder, ...filterFields } = newFilters

  // Update internal sort state
  sortState.value = { sortBy: sortBy ?? null, sortOrder: sortOrder ?? null }

  // Reset pagination and emit merged filters (overrides ensure new filter values are included
  // even though props.filters hasn't been updated yet)
  resetPagination(filterFields)
}

defineExpose({
  fetchData,
  resetPagination,
})

onMounted(() => {
  emit('update:filters', getFilters())
  if (props.autoFetch) {
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
      :filters="dataTableFilters"
      @update:filters="onFiltersUpdate"
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
