<script setup lang="ts">
/**
 * LogViewer - A component for displaying log messages with infinite scroll
 *
 * Features:
 * - Horizontal scrolling with single-line logs
 * - Infinite scroll with automatic pagination (scroll up to load older logs)
 * - Newest logs at bottom, oldest at top
 * - Preserves whitespace (space-sensitive)
 * - Alternating row background colors
 * - Header with action buttons (refresh, scroll to bottom)
 */

export interface LogItem {
  id: string | number
  level?: string
  message: string
  createdAt?: string
}

export interface LogViewerFetchParams {
  /** Cursor (ID of the oldest loaded log) for loading older logs */
  cursor?: string | number
  limit: number
}

export interface LogViewerFetchResult {
  items: LogItem[]
  pagination: {
    total: number
    hasNext: boolean
    next?: string | number
  }
}

interface Props {
  /** Fetch method for loading logs */
  fetchMethod: (params: LogViewerFetchParams) => Promise<LogViewerFetchResult>
  /** Number of items per page */
  pageSize?: number
  /** Height of the log viewer container */
  height?: string
  /** Show level column */
  showLevel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 100,
  height: '400px',
  showLevel: false,
})

const T = useTranslations('components.ui.LogViewer')

const logs = ref<LogItem[]>([])
const total = ref(0)
const isLoading = ref(false)
const scrollContainerRef = ref<HTMLDivElement | null>(null)
const isAtBottom = ref(true)
const nextCursor = ref<string | number | undefined>(undefined) // Cursor for next page
const hasNextPage = ref(true) // Track if more data is available
const requestVersion = ref(0) // Track request version to handle race conditions

const hasMore = computed(() => hasNextPage.value)

// Load logs (handles both initial load and load more)
async function load (forceRefresh = false) {
  // Skip if already loading (unless force refresh) or no more pages
  if ((isLoading.value && !forceRefresh) || !hasNextPage.value) return

  // Increment version to invalidate any in-flight requests
  const currentVersion = ++requestVersion.value
  const isInitial = logs.value.length === 0
  const container = scrollContainerRef.value
  const scrollHeightBefore = container?.scrollHeight ?? 0

  isLoading.value = true
  try {
    const result = await props.fetchMethod({
      cursor: nextCursor.value, // Pass the cursor from previous response
      limit: props.pageSize,
    })

    // Ignore result if a newer request was initiated
    if (currentVersion !== requestVersion.value) return

    // Update pagination state from API response
    total.value = result.pagination.total
    hasNextPage.value = result.pagination.hasNext
    nextCursor.value = result.pagination.next

    // If no items returned, we've reached the end
    if (result.items.length === 0) {
      return
    }

    // Reverse items: API returns newest first, we display oldest first (top) to newest (bottom)
    logs.value.unshift(...result.items.reverse())

    nextTick(() => {
      if (isInitial) {
        // Initial load: scroll to bottom to show newest logs
        scrollToBottom()
      } else if (container) {
        // Load more: maintain scroll position
        const scrollHeightAfter = container.scrollHeight
        container.scrollTop = scrollHeightAfter - scrollHeightBefore
      }
    })
  } finally {
    // Only update loading state if this is the latest request
    if (currentVersion === requestVersion.value) {
      isLoading.value = false
    }
  }
}

// Scroll to bottom
function scrollToBottom () {
  const container = scrollContainerRef.value
  if (container) {
    container.scrollTop = container.scrollHeight
  }
}

// Handle scroll to track if at bottom
function handleScroll () {
  const container = scrollContainerRef.value
  if (!container) return
  const threshold = 50
  isAtBottom.value = container.scrollHeight - container.scrollTop - container.clientHeight < threshold
}

// Get level color class
function getLevelClass (level?: string): string {
  if (!level) return 'text-muted-color'
  switch (level.toLowerCase()) {
    case 'error':
      return 'text-danger'
    case 'warn':
    case 'warning':
      return 'text-warn'
    case 'info':
      return 'text-info'
    default:
      return 'text-muted-color'
  }
}

// Format timestamp with year
function formatTime (dateStr?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

// Refresh - reload from beginning
function refresh () {
  logs.value = []
  total.value = 0
  nextCursor.value = undefined
  hasNextPage.value = true
  load(true) // Force refresh to bypass loading check
}

// Auto load on mount
onMounted(() => {
  load()
})

defineExpose({ refresh })
</script>

<template>
  <div
    class="
      flex flex-col overflow-hidden rounded-border border border-surface
      bg-ground
    "
  >
    <!-- Header with actions -->
    <div
      class="
        flex shrink-0 items-center justify-between border-b border-surface
        bg-surface px-2 py-1
      "
    >
      <span class="text-sm text-muted-color">
        {{ T('count', { loaded: logs.length, total }) }}
      </span>
      <div class="flex gap-2">
        <Tooltip :text="T('scrollToBottom')">
          <Button
            severity="secondary"
            text
            size="small"
            icon="pi pi-arrow-down"
            :disabled="isAtBottom"
            @click="scrollToBottom"
          />
        </Tooltip>
        <Tooltip :text="T('refresh')">
          <Button
            severity="secondary"
            text
            size="small"
            icon="pi pi-refresh"
            :loading="isLoading"
            @click="refresh"
          />
        </Tooltip>
      </div>
    </div>

    <!-- Scrollable log container -->
    <div
      ref="scrollContainerRef"
      class="overflow-auto py-2"
      :style="{ height }"
      @scroll="handleScroll"
    >
      <!-- Load more trigger at top -->
      <EffectIntersectionChecker
        v-if="hasMore && logs.length > 0"
        class="flex w-full items-center justify-center pb-2"
        :disabled="isLoading"
        @show="load"
      >
        <i class="pi pi-spinner pi-spin text-xl text-muted-color" />
      </EffectIntersectionChecker>

      <!-- Log entries -->
      <div class="min-w-max font-mono text-sm">
        <div
          v-for="(log, index) in logs"
          :key="log.id"
          class="flex gap-3 px-3 py-1 whitespace-nowrap"
          :class="index % 2 === 0 ? 'bg-emphasis' : ''"
        >
          <!-- Timestamp -->
          <span
            v-if="log.createdAt"
            class="shrink-0 text-muted-color"
          >
            {{ formatTime(log.createdAt) }}
          </span>

          <!-- Level -->
          <span
            v-if="showLevel && log.level"
            class="w-14 shrink-0 text-right font-semibold"
            :class="getLevelClass(log.level)"
          >
            {{ log.level.toUpperCase() }}
          </span>

          <!-- Message (whitespace-sensitive) -->
          <span class="whitespace-pre text-color">
            {{ log.message }}
          </span>
        </div>
      </div>

      <!-- Empty state -->
      <EmptyState
        v-if="!isLoading && logs.length === 0"
        class="py-8"
        :message="T('empty')"
      />

      <!-- Initial loading state -->
      <div
        v-if="isLoading && logs.length === 0"
        class="flex items-center justify-center py-8"
      >
        <i class="pi pi-spinner pi-spin text-4xl" />
      </div>
    </div>
  </div>
</template>
