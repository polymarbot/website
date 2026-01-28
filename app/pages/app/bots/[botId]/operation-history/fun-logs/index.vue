<script setup lang="ts">
import type {
  LogViewerFetchParams,
  LogViewerFetchResult,
} from '~/components/ui/LogViewer/index.vue'
import type { DateRange } from '~/components/ui/DateRangePicker/index.vue'
import LogViewer from '~/components/ui/LogViewer/index.vue'

definePageMeta({
  title: 'pages.app.bots._botId_.operation-history.fun-logs.title',
})

const T = useTranslations('pages.app.bots._botId_.operation-history.fun-logs')
const route = useRoute()
const request = useRequest()
const { isMobile } = useDevice()

// Get bot id from route
const botId = computed(() => route.params.botId as string)

// Date range filter
const dateRange = ref<DateRange>({ start: null, end: null })
const logViewerRef = ref<InstanceType<typeof LogViewer> | null>(null)

// Fetch logs method for LogViewer
async function fetchLogs ({ cursor, limit }: LogViewerFetchParams): Promise<LogViewerFetchResult> {
  const query: Record<string, any> = { cursor, limit }

  // Add time range filter
  if (dateRange.value.start) {
    query.startTime = dateRange.value.start.getTime()
  }
  if (dateRange.value.end) {
    query.endTime = dateRange.value.end.getTime()
  }

  const response = await request.get<{
    items: { id: number, level: string, message: string, createdAt: string }[]
    pagination: { total: number, hasNext: boolean, next?: number }
  }>(`/api/bots/${botId.value}/run-logs`, { query })
  return {
    items: response.items ?? [],
    pagination: {
      total: response.pagination.total ?? 0,
      hasNext: response.pagination.hasNext ?? false,
      next: response.pagination.next,
    },
  }
}

// Handle date range change
function handleDateRangeChange () {
  logViewerRef.value?.refresh()
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <Message severity="info">
      {{ T('notice') }}
    </Message>

    <!-- Filter toolbar -->
    <div class="flex items-center gap-2">
      <DateRangePicker
        v-model="dateRange"
        showTime
        :size="isMobile ? 'small' : undefined"
        @change="handleDateRangeChange"
      />
    </div>

    <LogViewer
      ref="logViewerRef"
      :fetchMethod="fetchLogs"
      height="calc(100vh - 390px)"
    />
  </div>
</template>
