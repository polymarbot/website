<script setup lang="ts">
import type { DateRange } from '~/components/ui/DateRangePicker/index.vue'
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
  /** Selected symbols array (if provided, shows symbol filter) */
  symbols?: MarketSymbolType[]
  /** Selected intervals array (if provided, shows interval filter) */
  intervals?: MarketIntervalType[]
  /** Readonly filter keys (show as Tag instead of buttons) */
  readonly?: ('datePreset' | 'symbols' | 'intervals')[]
  /** Show minutes suffix in interval labels, e.g. "1 Day (1440m)" */
  showIntervalMinutes?: boolean
  /** Allowed date presets (disallowed presets will be hidden, with "More" button shown) */
  allowedDatePresets?: StatsDatePresetType[]
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
})

const emit = defineEmits<{
  'update:datePreset': [value: StatsDatePresetType]
  'update:customStart': [value: number | undefined]
  'update:customEnd': [value: number | undefined]
  'update:symbols': [value: MarketSymbolType[]]
  'update:intervals': [value: MarketIntervalType[]]
}>()

const T = useTranslations('components.app.StrategyFilters')
const TC = useTranslations('common')

// All date presets
const allDatePresets: StatsDatePresetType[] = [
  StatsDatePreset.WEEK,
  StatsDatePreset.MONTH,
  StatsDatePreset.QUARTER,
  StatsDatePreset.ALL,
  StatsDatePreset.CUSTOM,
]

// Filtered presets based on allowed list (only show allowed presets)
const visiblePresets = computed(() => {
  if (!props.allowedDatePresets) return allDatePresets
  return allDatePresets.filter(preset => props.allowedDatePresets!.includes(preset))
})

// Check if there are hidden presets (to show "More" button)
const hasHiddenPresets = computed(() => {
  if (!props.allowedDatePresets) return false
  return props.allowedDatePresets.length < allDatePresets.length
})

// Dialog for upgrade prompt
const dialog = useDialog()

// Handle "More" button click - show upgrade dialog
async function handleMoreClick () {
  const confirmed = await dialog.confirm({
    type: 'info',
    header: T('upgradeDialog.title'),
    message: T('upgradeDialog.message'),
    acceptLabel: T('upgradeDialog.upgrade'),
    rejectLabel: T('upgradeDialog.cancel'),
  })
  if (confirmed) {
    navigateTo('/app/subscription')
  }
}

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

const localSymbols = computed({
  get: () => props.symbols ?? [],
  set: (value: MarketSymbolType[]) => emit('update:symbols', value),
})

const localIntervals = computed({
  get: () => props.intervals ?? [],
  set: (value: MarketIntervalType[]) => emit('update:intervals', value),
})

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

      <!-- Readonly mode: multiple Tags -->
      <template v-if="isReadonly('symbols')">
        <Tag
          v-for="symbol in localSymbols"
          :key="symbol"
          severity="secondary"
        >
          {{ getSymbolName(symbol) }}
        </Tag>
      </template>

      <!-- Interactive mode -->
      <SelectButtonGroup
        v-else
        v-model="localSymbols"
        :options="symbolOptions"
        multiple
        showClear
      >
        <template #option="{ option }">
          <img
            :src="getSymbolImage(option.value)"
            :alt="option.label"
            class="size-4 rounded-full"
          >
          {{ option.label }}
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

      <!-- Readonly mode: multiple Tags -->
      <template v-if="isReadonly('intervals')">
        <Tag
          v-for="interval in localIntervals"
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
        multiple
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
        <!-- Visible preset buttons -->
        <Button
          v-for="preset in visiblePresets"
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
        </Button>

        <!-- More options button (shown when some presets are hidden) -->
        <Button
          v-if="hasHiddenPresets"
          size="small"
          severity="secondary"
          outlined
          @click="handleMoreClick"
        >
          <i class="pi pi-ellipsis-h text-xs" />
          {{ TC('actions.more') }}
        </Button>

        <!-- Custom date range picker (inline after buttons when CUSTOM is selected) -->
        <DateRangePicker
          v-if="showCustomDatePicker"
          v-model="customDateRange"
          :maxDate="new Date()"
          size="small"
          class="w-40"
        />
      </template>
    </div>

    <!-- Append Slot -->
    <slot name="append" />
  </div>
</template>
