<script setup lang="ts">
import type { DateRange } from '@packages/layer-basic/app/components/ui/DateRangePicker/index.vue'
import { getIntervalLabel, getIntervalLabelWithMinutes } from '~/components/app/MarketIntervalSelect/utils'

/**
 * StrategyFilters Component
 *
 * A pre-configured filter component for strategy-related pages.
 * Filters are automatically shown/hidden based on whether the corresponding prop is provided.
 *
 * Props align with API parameters for consistency:
 * - datePreset: StatsDatePresetType (WEEK, MONTH, QUARTER, ALL, CUSTOM)
 * - customStart/customEnd: Unix timestamps (only used when datePreset is CUSTOM)
 */

export interface StrategyFiltersProps {
  /** Selected date preset (if provided, shows date range filter) */
  datePreset?: StatsDatePresetType
  /** Custom start time (Unix timestamp in seconds, used when datePreset is CUSTOM) */
  customStart?: number
  /** Custom end time (Unix timestamp in seconds, used when datePreset is CUSTOM) */
  customEnd?: number
  /** Selected symbols as comma-separated string (if provided, shows symbol filter) */
  symbols?: string
  /** Selected intervals as comma-separated string (if provided, shows interval filter) */
  intervals?: string
  /** Readonly filter keys (show as Tag instead of buttons) */
  readonly?: ('datePreset' | 'symbols' | 'intervals')[]
  /** Show minutes suffix in interval labels, e.g. "1 Day (1440m)" */
  showIntervalMinutes?: boolean
  /** Allowed date presets (non-allowed presets are shown but trigger upgrade modal on click) */
  allowedDatePresets?: StatsDatePresetType[]
  /** Allow multiple symbol selection */
  multipleSymbols?: boolean
  /** Allow multiple interval selection */
  multipleIntervals?: boolean
  /** Per-symbol participation counts, displayed in parentheses after symbol name */
  symbolCounts?: Record<string, number>
}

const props = withDefaults(defineProps<StrategyFiltersProps>(), {
  datePreset: undefined,
  customStart: undefined,
  customEnd: undefined,
  symbols: undefined,
  intervals: undefined,
  readonly: () => [],
  showIntervalMinutes: true,
  allowedDatePresets: undefined,
  multipleSymbols: false,
  multipleIntervals: false,
  symbolCounts: undefined,
})

const emit = defineEmits<{
  'update:datePreset': [value: StatsDatePresetType]
  'update:customStart': [value: number | undefined]
  'update:customEnd': [value: number | undefined]
  'update:symbols': [value: string]
  'update:intervals': [value: string]
}>()

const T = useTranslations('components.app.StrategyFilters')

// All date presets
const allDatePresets: StatsDatePresetType[] = [
  StatsDatePreset.WEEK,
  StatsDatePreset.MONTH,
  StatsDatePreset.QUARTER,
  StatsDatePreset.ALL,
  StatsDatePreset.CUSTOM,
]

// Check if a preset is allowed (not restricted)
function isPresetAllowed (preset: StatsDatePresetType): boolean {
  if (!props.allowedDatePresets) return true
  return props.allowedDatePresets.includes(preset)
}

// Upgrade modal state
const showUpgradeModal = ref(false)
const upgradeTargetPlan = ref<SubscriptionPlanType | undefined>(undefined)

// All available symbols and intervals
const allSymbols = Object.values(MarketSymbol)
const allIntervals = Object.values(MarketInterval)

// Determine visibility based on whether prop is provided
const showDatePreset = computed(() => props.datePreset !== undefined)
const showSymbols = computed(() => props.symbols !== undefined)
const showIntervals = computed(() => props.intervals !== undefined)

// Internal state synced with props
const localDatePreset = computed({
  get: () => props.datePreset ?? StatsDatePreset.WEEK,
  set: (value: StatsDatePresetType) => emit('update:datePreset', value),
})

// Convert between comma-separated string and array/single value for SelectButtonGroup
const localSymbols = computed<MarketSymbolType | MarketSymbolType[]>({
  get: () => {
    if (props.multipleSymbols) {
      return props.symbols ? props.symbols.split(',') as MarketSymbolType[] : []
    }
    return (props.symbols || '') as MarketSymbolType
  },
  set: (value: MarketSymbolType[] | MarketSymbolType) => {
    if (props.multipleSymbols) {
      emit('update:symbols', (value as MarketSymbolType[])?.join(',') ?? '')
    } else {
      emit('update:symbols', (value as string) ?? '')
    }
  },
})

const localIntervals = computed<MarketIntervalType | MarketIntervalType[]>({
  get: () => {
    if (props.multipleIntervals) {
      return props.intervals ? props.intervals.split(',') as MarketIntervalType[] : []
    }
    return (props.intervals || '') as MarketIntervalType
  },
  set: (value: MarketIntervalType[] | MarketIntervalType) => {
    if (props.multipleIntervals) {
      emit('update:intervals', (value as MarketIntervalType[])?.join(',') ?? '')
    } else {
      emit('update:intervals', (value as string) ?? '')
    }
  },
})

// Arrays for readonly display (always return array)
const symbolsForDisplay = computed(() =>
  props.symbols ? props.symbols.split(',') as MarketSymbolType[] : [],
)

const intervalsForDisplay = computed(() =>
  props.intervals ? props.intervals.split(',') as MarketIntervalType[] : [],
)

// Custom date range for DateRangePicker (converts between Date and Unix timestamp)
const customDateRange = computed<DateRange>({
  get: () => ({
    start: props.customStart ? new Date(props.customStart * 1000) : null,
    end: props.customEnd ? new Date(props.customEnd * 1000) : null,
  }),
  set: (value: DateRange) => {
    emit('update:customStart', value.start ? Math.floor(value.start.getTime() / 1000) : undefined)
    emit('update:customEnd', value.end ? Math.floor(value.end.getTime() / 1000) : undefined)
  },
})

// Show custom date picker when CUSTOM preset is selected
const showCustomDatePicker = computed(() => localDatePreset.value === StatsDatePreset.CUSTOM)

// Check if custom date range is valid (both present, start <= end, span <= MAX_DATE_RANGE_DAYS)
function isCustomDateRangeValid (start?: number, end?: number): boolean {
  return !!start && !!end && start <= end && (end - start) <= MAX_DATE_RANGE_DAYS * 86400
}

// Fill default custom date range (last 7 days)
function fillDefaultCustomDateRange () {
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(start.getDate() - 7)
  start.setHours(0, 0, 0, 0)
  customDateRange.value = { start, end }
}

// Validate custom dates on init: if CUSTOM preset with invalid dates, auto-fill defaults
onMounted(() => {
  if (props.datePreset === StatsDatePreset.CUSTOM && !isCustomDateRangeValid(props.customStart, props.customEnd)) {
    fillDefaultCustomDateRange()
  }
})

// Check if a filter is readonly
function isReadonly (key: 'datePreset' | 'symbols' | 'intervals'): boolean {
  return props.readonly.includes(key)
}

// Check if a preset is selected
function isPresetSelected (preset: StatsDatePresetType): boolean {
  return localDatePreset.value === preset
}

// Handle preset click
function handlePresetClick (preset: StatsDatePresetType) {
  if (!isPresetAllowed(preset)) {
    upgradeTargetPlan.value = getRequiredPlanForStats('datePreset', preset)
    showUpgradeModal.value = true
    return
  }

  if (preset === StatsDatePreset.CUSTOM) {
    // Auto-fill with last 7 days when switching to CUSTOM with no valid dates
    if (!isCustomDateRangeValid(props.customStart, props.customEnd)) {
      fillDefaultCustomDateRange()
    }
  } else {
    // Clear custom dates when switching away from CUSTOM
    if (props.customStart || props.customEnd) {
      customDateRange.value = { start: null, end: null }
    }
  }

  localDatePreset.value = preset
}

// Symbol options for SelectButtonGroup
const symbolOptions = computed(() =>
  allSymbols.map(symbol => ({
    label: getSymbolName(symbol),
    value: symbol,
  })),
)

// Interval options for SelectButtonGroup
const intervalOptions = computed(() =>
  allIntervals.map(interval => ({
    label: props.showIntervalMinutes ? getIntervalLabelWithMinutes(interval) : getIntervalLabel(interval),
    value: interval,
  })),
)

// Get symbol label with optional count suffix
function getSymbolLabel (symbol: MarketSymbolType): string {
  const name = getSymbolName(symbol)
  const count = props.symbolCounts?.[symbol]
  return count !== undefined ? `${name} (${count})` : name
}

// Get date preset label
function getDatePresetLabel (preset: StatsDatePresetType): string {
  return T(`dateRange.${preset.toLowerCase()}`)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Symbol Filter -->
    <div
      v-if="showSymbols"
      class="flex flex-wrap items-center gap-2"
    >
      <span class="text-sm text-muted-color">
        {{ T('labels.symbol') }}:
      </span>

      <!-- Readonly mode: Tags -->
      <template v-if="isReadonly('symbols')">
        <Tag
          v-for="symbol in symbolsForDisplay"
          :key="symbol"
          severity="secondary"
        >
          {{ getSymbolLabel(symbol) }}
        </Tag>
      </template>

      <!-- Interactive mode -->
      <SelectButtonGroup
        v-else
        v-model="localSymbols"
        :options="symbolOptions"
        :multiple="multipleSymbols"
        showClear
      >
        <template #option="{ option }">
          <img
            :src="getSymbolImage(option.value as MarketSymbolType)"
            :alt="option.label"
            class="size-4 rounded-full"
          >
          {{ getSymbolLabel(option.value as MarketSymbolType) }}
        </template>
      </SelectButtonGroup>
    </div>

    <!-- Interval Filter -->
    <div
      v-if="showIntervals"
      class="flex flex-wrap items-center gap-2"
    >
      <span class="text-sm text-muted-color">
        {{ T('labels.interval') }}:
      </span>

      <!-- Readonly mode: Tags -->
      <template v-if="isReadonly('intervals')">
        <Tag
          v-for="interval in intervalsForDisplay"
          :key="interval"
          severity="secondary"
        >
          {{ getIntervalLabelWithMinutes(interval) }}
        </Tag>
      </template>

      <!-- Interactive mode -->
      <SelectButtonGroup
        v-else
        v-model="localIntervals"
        :options="intervalOptions"
        :multiple="multipleIntervals"
        showClear
      />
    </div>

    <!-- Date Preset Filter -->
    <div
      v-if="showDatePreset"
      class="flex flex-wrap items-center gap-2"
    >
      <span class="text-sm text-muted-color">
        {{ T('labels.dateRange') }}:
      </span>

      <!-- Readonly mode: single Tag -->
      <Tag
        v-if="isReadonly('datePreset')"
        severity="secondary"
      >
        {{ getDatePresetLabel(localDatePreset) }}
      </Tag>

      <!-- Interactive mode -->
      <template v-else>
        <!-- Preset buttons (non-allowed presets trigger upgrade modal) -->
        <Button
          v-for="preset in allDatePresets"
          :key="preset"
          size="small"
          :severity="isPresetSelected(preset) ? 'primary' : 'secondary'"
          :outlined="!isPresetSelected(preset)"
          @click="handlePresetClick(preset)"
        >
          <template v-if="preset === 'CUSTOM'">
            <i class="pi pi-calendar text-xs" />
          </template>
          {{ getDatePresetLabel(preset) }}
          <i
            v-if="!isPresetAllowed(preset)"
            class="pi pi-lock text-xs"
          />
        </Button>

        <!-- Custom date range picker (inline after buttons when CUSTOM is selected) -->
        <DateRangePicker
          v-if="showCustomDatePicker"
          v-model="customDateRange"
          :maxDate="new Date()"
          :maxSpanDays="MAX_DATE_RANGE_DAYS"
          size="small"
          class="w-40"
        />
      </template>
    </div>

    <!-- Append Slot -->
    <slot name="append" />

    <!-- Upgrade Modal -->
    <AppUpgradeModal
      v-model:visible="showUpgradeModal"
      :targetPlan="upgradeTargetPlan"
    />
  </div>
</template>
