<script setup lang="ts" generic="TData extends Record<string, any>">
import type { Component } from 'vue'
import type { ColumnProps } from 'primevue/column'
import type { DataTableProps as BaseDataTableProps } from 'primevue/datatable'
import type { MenuItem } from 'primevue/menuitem'
import { get } from 'lodash-es'

export type DataTableColumnType = 'text' | 'date' | 'unixDate' | 'currency' | 'empty'
export type DataTableColumnAlign = 'left' | 'center' | 'right'
export type DataTableColumnFixed = 'left' | 'right'
export type DataTableSelectionMode = 'single' | 'multiple'

export interface DataTableColumnFilterOption {
  /** Option display label */
  label: string
  /** Option value, null represents "All" */
  value: any
}

export interface DataTableColumnFilter {
  /** Filter field name, defaults to column.field */
  field?: string
  /** Filter options (required when no component is provided) */
  options?: DataTableColumnFilterOption[]
  /** Custom filter component (receives modelValue and emits update:modelValue) */
  component?: Component
}

export interface DataTableColumn {
  /** Column identifier - used for field binding and slot naming */
  field: string
  /** Column header title */
  title?: string
  /** Column value type for formatting */
  type?: DataTableColumnType
  /** Fixed column width (e.g., '100px', '10rem') */
  width?: string
  /** Minimum column width (e.g., '100px', '10rem') */
  minWidth?: string
  /** Content alignment: left, center, right. Default: left */
  align?: DataTableColumnAlign
  /** Fixed column position: left or right */
  fixed?: DataTableColumnFixed
  /** Whether text can wrap. Default: false (no wrap) */
  wrap?: boolean
  /** Column filter configuration */
  filter?: DataTableColumnFilter
  /** Pass-through props to PrimeVue Column component */
  columnProps?: Omit<ColumnProps, 'field' | 'header' | 'frozen' | 'alignFrozen'>
}

export interface DataTableSlotProps<T = Record<string, any>> {
  column: DataTableColumn
  row: T
  value: unknown
  index: number
}

export interface DataTableProps extends /* @vue-ignore */ BaseDataTableProps {
  /** Column definitions */
  columns?: DataTableColumn[]
  /** Selection mode: single or multiple */
  selectionMode?: DataTableSelectionMode
  /** Current filter values (controlled externally) */
  filterValues?: Record<string, any>
}

const props = withDefaults(defineProps<DataTableProps>(), {
  columns: () => [],
  selectionMode: undefined,
  filterValues: undefined,
})

const emit = defineEmits<{
  /** Emitted when a filter value changes */
  filterChange: [field: string, value: any]
}>()

const selection = defineModel<TData | TData[] | null>('selection', { default: null })

defineSlots<
  Record<string, (_: {
    column: DataTableColumn
    row: TData
    value: unknown
    index: number
  }) => any> & {
    empty?: () => any
  } & Record<`header-${string}`, (_: { column: DataTableColumn }) => any>
>()

const T = useTranslations('components.ui.DataTable')
const { formatDateTime } = useDate()

const showSelectionColumn = computed(() => !!props.selectionMode)

function formatCellValue (value: unknown, type: DataTableColumnType = 'text'): string {
  if (value === null || value === undefined) return ''

  switch (type) {
    case 'text':
      return String(value)

    case 'date': {
      let date: Date | null = null
      if (value instanceof Date) {
        date = value
      } else if (typeof value === 'string') {
        date = new Date(value)
      }
      if (date && !isNaN(date.getTime())) {
        const formatted = formatDateTime(date)
        // Split date and time with newline
        return formatted.split(' ').join('\n')
      }
      return String(value)
    }

    case 'unixDate': {
      if (typeof value === 'number') {
        const date = new Date(value * 1000)
        if (!isNaN(date.getTime())) {
          const formatted = formatDateTime(date)
          // Split date and time with newline
          return formatted.split(' ').join('\n')
        }
      }
      return String(value)
    }

    case 'currency': {
      return formatCurrency(value as number | string)
    }

    case 'empty':
      return ''

    default:
      return String(value)
  }
}

// Compute edge frozen columns for shadow effect
const lastLeftFrozenField = computed(() => {
  const leftFrozen = props.columns.filter(c => c.fixed === 'left')
  return leftFrozen.at(-1)?.field ?? null
})

const firstRightFrozenField = computed(() => {
  const rightFrozen = props.columns.filter(c => c.fixed === 'right')
  return rightFrozen.at(0)?.field ?? null
})

// Determine if selection column should have shadow (when it's the last left frozen column)
const selectionColumnShadow = computed(() => {
  // If there are no left-frozen columns, selection column gets the shadow
  return showSelectionColumn.value && !lastLeftFrozenField.value
})

function buildColumnStyle (column: DataTableColumn): Record<string, string> {
  const style: Record<string, string> = {}

  if (column.width) style.width = column.width
  if (column.minWidth) style.minWidth = column.minWidth
  if (column.align) style.textAlign = column.align

  // Handle white-space for different column types
  if (column.type === 'date' || column.type === 'unixDate') {
    style.whiteSpace = 'pre'
  } else if (!column.wrap) {
    style.whiteSpace = 'nowrap'
  }

  // Add shadow for edge frozen columns
  if (column.field === lastLeftFrozenField.value) {
    style.boxShadow = '4px 0 8px -4px rgba(0, 0, 0, 0.15)'
  } else if (column.field === firstRightFrozenField.value) {
    style.boxShadow = '-4px 0 8px -4px rgba(0, 0, 0, 0.15)'
  }

  return style
}

function getFilterField (column: DataTableColumn): string {
  return column.filter?.field ?? column.field
}

function getFilterValue (column: DataTableColumn): any {
  if (!props.filterValues) return null
  const field = getFilterField(column)
  return props.filterValues[field] ?? null
}

function hasActiveFilter (column: DataTableColumn): boolean {
  return getFilterValue(column) !== null
}

function buildFilterMenuItems (column: DataTableColumn): MenuItem[] {
  if (!column.filter) return []

  const filterField = getFilterField(column)
  const currentValue = getFilterValue(column)
  const items: MenuItem[] = []

  items.push({
    label: T('filterAll'),
    class: currentValue === null ? 'font-semibold bg-emphasis' : '',
    command: () => emit('filterChange', filterField, null),
  })
  items.push({ separator: true })

  column.filter.options?.forEach(option => {
    items.push({
      label: option.label,
      class: currentValue === option.value ? 'font-semibold bg-emphasis' : '',
      command: () => emit('filterChange', filterField, option.value),
    })
  })

  return items
}

function getFilterActiveIndex (column: DataTableColumn): number {
  if (!column.filter?.options) return -1

  const currentValue = getFilterValue(column)
  if (currentValue === null) return 0

  const index = column.filter.options.findIndex(o => o.value === currentValue)
  return index >= 0 ? index + 2 : -1
}

// Pending filter values for custom component filters (applied only on "Apply" click)
const pendingFilterValues = ref<Record<string, any>>({})

function initPendingFilter (column: DataTableColumn) {
  const field = getFilterField(column)
  pendingFilterValues.value[field] = getFilterValue(column)
}

function getPendingFilterValue (column: DataTableColumn): any {
  const field = getFilterField(column)
  return pendingFilterValues.value[field]
}

function setPendingFilterValue (column: DataTableColumn, value: any) {
  const field = getFilterField(column)
  pendingFilterValues.value[field] = value
}

function applyFilter (column: DataTableColumn, hide: () => void) {
  const field = getFilterField(column)
  const value = pendingFilterValues.value[field]
  emit('filterChange', field, value === undefined ? null : value)
  hide()
}

function clearFilter (column: DataTableColumn, hide: () => void) {
  const field = getFilterField(column)
  pendingFilterValues.value[field] = null
  emit('filterChange', field, null)
  hide()
}
</script>

<template>
  <PrimeDataTable
    v-model:selection="selection"
    :selectionMode="selectionMode"
  >
    <!-- Selection column (frozen to left) -->
    <PrimeColumn
      v-if="showSelectionColumn"
      :selectionMode="selectionMode"
      frozen
      alignFrozen="left"
      :style="selectionColumnShadow ? { width: '3rem', boxShadow: '4px 0 8px -4px rgba(0, 0, 0, 0.15)' } : { width: '3rem' }"
    />

    <!-- Data columns -->
    <PrimeColumn
      v-for="column in columns"
      :key="column.field"
      :field="column.field"
      :frozen="!!column.fixed"
      :alignFrozen="column.fixed"
      :style="buildColumnStyle(column)"
      v-bind="column.columnProps"
    >
      <template #header>
        <slot
          :name="`header-${column.field}`"
          :column="column"
        >
          <div
            v-if="column.filter"
            class="flex items-center gap-2 font-semibold"
          >
            <span>{{ column.title }}</span>
            <!-- Custom component filter -->
            <Dropdown
              v-if="column.filter.component"
              trigger="click"
              @click="initPendingFilter(column)"
            >
              <Button
                text
                size="small"
                :icon="hasActiveFilter(column) ? 'pi pi-filter-fill' : 'pi pi-filter'"
                :severity="hasActiveFilter(column) ? 'primary' : 'secondary'"
              />
              <template #popup="{ hide }">
                <div class="flex flex-col gap-3">
                  <component
                    :is="column.filter.component"
                    :modelValue="getPendingFilterValue(column)"
                    @update:modelValue="setPendingFilterValue(column, $event)"
                  />
                  <div class="flex justify-between gap-2">
                    <Button
                      outlined
                      size="small"
                      :label="T('filterClear')"
                      @click="clearFilter(column, hide)"
                    />
                    <Button
                      size="small"
                      :label="T('filterApply')"
                      @click="applyFilter(column, hide)"
                    />
                  </div>
                </div>
              </template>
            </Dropdown>
            <!-- Options-based filter menu -->
            <Dropdown
              v-else
              :menus="buildFilterMenuItems(column)"
              :activeIndex="getFilterActiveIndex(column)"
              trigger="click"
            >
              <Button
                text
                size="small"
                :icon="hasActiveFilter(column) ? 'pi pi-filter-fill' : 'pi pi-filter'"
                :severity="hasActiveFilter(column) ? 'primary' : 'secondary'"
              />
            </Dropdown>
          </div>
          <span
            v-else
            class="font-semibold"
          >
            {{ column.title }}
          </span>
        </slot>
      </template>
      <template #body="{ data, index }">
        <slot
          :name="column.field"
          :column="column"
          :row="data"
          :value="get(data, column.field)"
          :index="index"
        >
          {{ formatCellValue(get(data, column.field), column.type) }}
        </slot>
      </template>
    </PrimeColumn>

    <!-- Empty state -->
    <template #empty>
      <slot name="empty">
        <EmptyState
          class="py-12"
          :message="T('empty')"
        />
      </slot>
    </template>
  </PrimeDataTable>
</template>
