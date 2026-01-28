<script setup lang="ts">
import type { DataTableColumn } from '~/components/ui/DataTable/index.vue'
import type {
  AsyncDataTableFetchParams,
  AsyncDataTableFetchResult,
} from '~/components/ui/AsyncDataTable/index.vue'
import type { DateRange } from '~/components/ui/DateRangePicker/index.vue'

const route = useRoute()
const T = useTranslations('pages.app.bots._botId_.operation-history')
const request = useRequest()
const { isMobile } = useDevice()

// Get bot id from route
const botId = computed(() => route.params.botId as string)

// Date range filter
const dateRange = ref<DateRange>({ start: null, end: null })
const tableRef = useTemplateRef<{ resetPagination: () => void }>('tableRef')

// Fetch operation history for AsyncDataTable
async function fetchOperationHistory ({ offset, limit }: AsyncDataTableFetchParams): Promise<AsyncDataTableFetchResult<BotOperationHistoryItem>> {
  const query: Record<string, any> = { offset, limit }

  // Add time range filter
  if (dateRange.value.start) {
    query.startTime = dateRange.value.start.getTime()
  }
  if (dateRange.value.end) {
    query.endTime = dateRange.value.end.getTime()
  }

  const response = await request.get<{
    items: BotOperationHistoryItem[]
    pagination: { total: number }
  }>(`/api/bots/${botId.value}/operation-history`, { query })
  return {
    items: response.items ?? [],
    total: response.pagination.total ?? 0,
  }
}

// Handle date range change
function handleDateRangeChange () {
  tableRef.value?.resetPagination()
}

// Get action label and severity
function getActionLabel (action: BotOperationTypeValue): string {
  return T(`action.${action}`)
}

function getActionSeverity (action: BotOperationTypeValue): 'success' | 'secondary' | 'info' | 'warn' | 'danger' {
  switch (action) {
    case BotOperationType.ENABLED:
      return 'success' // Green - bot started
    case BotOperationType.DISABLED:
      return 'danger' // Red - bot stopped
    default:
      return 'secondary'
  }
}

// Get reason label
function getReasonLabel (reason: BotOperationReasonType): string {
  return T(`reason.${reason}`)
}

// Table columns definition
const columns: DataTableColumn[] = [
  {
    field: 'action',
    title: T('table.action'),
  },
  {
    field: 'reason',
    title: T('table.reason'),
  },
  {
    field: 'createdAt',
    title: T('table.operatedAt'),
    type: 'date',
  },
]
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Filter toolbar -->
    <div class="flex items-center gap-2">
      <DateRangePicker
        v-model="dateRange"
        showTime
        :size="isMobile ? 'small' : undefined"
        @change="handleDateRangeChange"
      />
    </div>

    <!-- Data table -->
    <AsyncDataTable
      ref="tableRef"
      :columns="columns"
      :fetchMethod="fetchOperationHistory"
      :tableProps="{ scrollable: true, scrollHeight: 'flex' }"
    >
      <!-- Action column -->
      <template #action="{ row }">
        <Tag
          :severity="getActionSeverity(row.action)"
          size="small"
        >
          {{ getActionLabel(row.action) }}
        </Tag>
      </template>

      <!-- Reason column -->
      <template #reason="{ row }">
        <span class="text-muted-color">
          {{ getReasonLabel(row.reason) }}
        </span>
      </template>
    </AsyncDataTable>
  </div>
</template>
