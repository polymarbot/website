<script setup lang="ts">
/**
 * LogViewer - A component for displaying log messages with bidirectional infinite scroll
 *
 * Features:
 * - Bidirectional infinite scroll (scroll up for older, scroll down for newer)
 * - Newest logs at bottom, oldest at top
 * - Horizontal scrolling with single-line logs, preserves whitespace
 * - Highlight row with border indicator for search matches
 * - Header with action buttons (scroll to bottom, refresh)
 * - "All loaded" indicators when no more data in either direction
 * - Jump to a specific point with context loading via refresh(cursor)
 */

export type LogDirection = 'backward' | 'forward'

export interface LogItem {
  id: string | number
  level?: string
  message: string
  createdAt?: string
  tag?: string | null
}

export interface LogViewerFetchParams {
  /** Opaque cursor string for pagination */
  cursor?: string
  /** Direction: backward = older logs, forward = newer logs */
  direction: LogDirection
  limit: number
}

export interface LogViewerFetchResult {
  items: LogItem[]
  pagination: {
    total?: number
    next?: string
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
  /** Auto load on mount. When false, first load must be triggered by calling refresh() */
  autoLoad?: boolean
  /** ID of the log entry to highlight (scroll target) */
  highlightId?: string | number
  /** Keyword to highlight in log messages */
  highlightKeyword?: string
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 100,
  height: '400px',
  showLevel: false,
  autoLoad: true,
  highlightId: undefined,
  highlightKeyword: '',
})

const T = useTranslations('components.ui.LogViewer')

// --- State ---

const logs = ref<LogItem[]>([])
const total = ref(0)
const scrollContainerRef = ref<HTMLDivElement | null>(null)
const lastRefreshCursor = ref<string | undefined>(undefined)

const backwardCursor = ref<string | undefined>(undefined)
const forwardCursor = ref<string | undefined>(undefined)
const hasMoreBackward = ref(true)
const hasMoreForward = ref(false)
const isLoadingBackward = ref(false)
const isLoadingForward = ref(false)
const isLoading = computed(() => isLoadingBackward.value || isLoadingForward.value)
const backwardVersion = ref(0)
const forwardVersion = ref(0)

// --- Utilities ---

function buildCursor (item: LogItem): string {
  return `${item.id},${new Date(item.createdAt!).getTime()}`
}

function scrollToBottom () {
  const container = scrollContainerRef.value
  if (container) {
    container.scrollTop = container.scrollHeight
  }
}

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

function escapeHtml (str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function highlightMessage (message: string): string {
  if (!props.highlightKeyword) return escapeHtml(message)
  const escaped = escapeHtml(message)
  const keywordEscaped = escapeHtml(props.highlightKeyword)
  const regex = new RegExp(`(${keywordEscaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return escaped.replace(regex, '<mark class="bg-warn/30 text-color rounded-sm px-0.5">$1</mark>')
}

function scrollToHighlight () {
  nextTick(() => {
    const el = scrollContainerRef.value?.querySelector('[data-highlight]')
    el?.scrollIntoView({ block: 'center', behavior: 'instant' })
  })
}

function resetState () {
  logs.value = []
  backwardCursor.value = undefined
  forwardCursor.value = undefined
  hasMoreBackward.value = true
  hasMoreForward.value = false
  isLoadingBackward.value = false
  isLoadingForward.value = false
}

// --- Loading ---

async function loadBackward () {
  if (isLoadingBackward.value || !hasMoreBackward.value) return

  const currentVersion = ++backwardVersion.value
  const isInitial = logs.value.length === 0
  const container = scrollContainerRef.value
  const scrollHeightBefore = container?.scrollHeight ?? 0

  isLoadingBackward.value = true
  try {
    const result = await props.fetchMethod({
      cursor: backwardCursor.value,
      direction: 'backward',
      limit: props.pageSize,
    })

    if (currentVersion !== backwardVersion.value) return

    if (result.pagination.total != null) {
      total.value = result.pagination.total
    }

    // Update cursor and hasMore from next; skip if cursor unchanged (cached duplicate)
    if (result.pagination.next) {
      if (result.pagination.next === backwardCursor.value) return
      backwardCursor.value = result.pagination.next
    }
    hasMoreBackward.value = !!result.pagination.next

    if (result.items.length === 0) return

    // API returns newest first for backward, reverse to display oldest-first
    const items = result.items.concat().reverse()

    // On normal initial load (no cursor), set forward cursor from the newest item
    if (isInitial && !forwardCursor.value) {
      forwardCursor.value = buildCursor(items[items.length - 1]!)
    }

    // Skip last item if it duplicates the first existing item (same cursor used in refresh)
    const lastBackward = items[items.length - 1]
    const firstExisting = logs.value[0]
    const endIndex = (lastBackward && firstExisting && lastBackward.id === firstExisting.id)
      ? items.length - 1
      : items.length
    logs.value.unshift(...items.slice(0, endIndex))

    nextTick(() => {
      if (isInitial) {
        scrollToBottom()
      } else if (container) {
        // Maintain scroll position
        const scrollHeightAfter = container.scrollHeight
        container.scrollTop = scrollHeightAfter - scrollHeightBefore
      }
    })
  } finally {
    if (currentVersion === backwardVersion.value) {
      isLoadingBackward.value = false
    }
  }
}

async function loadForward () {
  if (isLoadingForward.value || !hasMoreForward.value) return

  const currentVersion = ++forwardVersion.value

  isLoadingForward.value = true
  try {
    const result = await props.fetchMethod({
      cursor: forwardCursor.value,
      direction: 'forward',
      limit: props.pageSize,
    })

    if (currentVersion !== forwardVersion.value) return

    // Update cursor and hasMore from next; skip if cursor unchanged (cached duplicate)
    if (result.pagination.next) {
      if (result.pagination.next === forwardCursor.value) return
      forwardCursor.value = result.pagination.next
    }
    hasMoreForward.value = !!result.pagination.next

    if (result.items.length === 0) return

    // API returns oldest first for forward, already in correct display order
    // Skip first item if it duplicates the last backward item (same cursor used in refresh)
    const firstForward = result.items[0]
    const lastExisting = logs.value[logs.value.length - 1]
    const startIndex = (firstForward && lastExisting && firstForward.id === lastExisting.id) ? 1 : 0
    logs.value.push(...result.items.slice(startIndex))
  } finally {
    if (currentVersion === forwardVersion.value) {
      isLoadingForward.value = false
    }
  }
}

// --- Actions ---

function handleScrollToBottom () {
  hasMoreForward.value = true
  scrollToBottom()
}

/**
 * Refresh the log viewer.
 * - No cursor: reload from the beginning (newest logs)
 * - With cursor: load one page backward + one page forward around the given point
 */
async function refresh (cursor?: string) {
  lastRefreshCursor.value = cursor
  resetState()
  if (cursor) {
    backwardCursor.value = cursor
    forwardCursor.value = cursor
    hasMoreForward.value = true
    await Promise.all([ loadBackward(), loadForward() ])
    // Scroll to highlight after both directions loaded
    if (props.highlightId !== undefined) {
      scrollToHighlight()
    }
  } else {
    loadBackward()
  }
}

function handleHeaderRefresh () {
  refresh(lastRefreshCursor.value)
}

// --- Lifecycle ---

onMounted(() => {
  if (props.autoLoad) {
    loadBackward()
  }
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
            :disabled="isLoading || logs.length === 0"
            @click="handleScrollToBottom"
          />
        </Tooltip>
        <Tooltip :text="T('refresh')">
          <Button
            severity="secondary"
            text
            size="small"
            icon="pi pi-refresh"
            :loading="isLoading"
            @click="handleHeaderRefresh"
          />
        </Tooltip>
      </div>
    </div>

    <!-- Scrollable log container -->
    <div
      ref="scrollContainerRef"
      class="selectable overflow-auto py-2"
      :style="{ height }"
    >
      <!-- Backward: all loaded indicator -->
      <div
        v-if="!hasMoreBackward && logs.length > 0"
        class="pb-2 text-center text-xs text-muted-color"
      >
        {{ T('allLoaded') }}
      </div>

      <!-- Backward: load more trigger at top -->
      <EffectIntersectionChecker
        v-if="hasMoreBackward && logs.length > 0"
        class="flex w-full items-center justify-center pb-2"
        :disabled="isLoadingBackward"
        @show="loadBackward"
      >
        <i class="pi pi-spinner pi-spin text-xl text-muted-color" />
      </EffectIntersectionChecker>

      <!-- Log entries -->
      <div class="min-w-max font-mono text-sm">
        <div
          v-for="log in logs"
          :key="log.id"
          :data-highlight="log.id === highlightId ? '' : undefined"
          class="flex gap-3 border-l-3 px-3 py-1 whitespace-nowrap"
          :class="[
            log.id === highlightId
              ? 'border-warn bg-warn/20'
              : 'border-transparent',
          ]"
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

          <!-- Tag -->
          <span
            v-if="log.tag"
            class="
              shrink-0 rounded-sm bg-primary/15 px-1.5 text-xs/5 text-primary
            "
          >
            {{ log.tag }}
          </span>

          <!-- Message (whitespace-sensitive, with keyword highlighting) -->
          <span
            v-if="highlightKeyword"
            class="whitespace-pre text-color"
            v-html="highlightMessage(log.message)"
          />
          <span
            v-else
            class="whitespace-pre text-color"
          >
            {{ log.message }}
          </span>
        </div>
      </div>

      <!-- Forward: load more trigger at bottom -->
      <EffectIntersectionChecker
        v-if="hasMoreForward && logs.length > 0"
        class="flex w-full items-center justify-center pt-2"
        :disabled="isLoadingForward"
        @show="loadForward"
      >
        <i class="pi pi-spinner pi-spin text-xl text-muted-color" />
      </EffectIntersectionChecker>

      <!-- Forward: all loaded indicator -->
      <div
        v-if="!hasMoreForward && logs.length > 0"
        class="pt-2 text-center text-xs text-muted-color"
      >
        {{ T('allLoaded') }}
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
