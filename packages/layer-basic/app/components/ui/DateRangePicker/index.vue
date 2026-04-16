<script setup lang="ts">
import type { DatePickerProps as BaseDatePickerProps } from 'primevue/datepicker'

export interface DateRange {
  start: Date | null
  end: Date | null
}

export interface DateRangePickerProps extends /* @vue-ignore */ Omit<BaseDatePickerProps, 'modelValue' | 'selectionMode' | 'minDate' | 'maxDate'> {
  /** Date range value */
  modelValue?: DateRange
  /** Minimum selectable date for both pickers */
  minDate?: Date
  /** Maximum selectable date for both pickers */
  maxDate?: Date
  /** Maximum span in days between start and end date */
  maxSpanDays?: number
  /** Placeholder for start date input */
  startPlaceholder?: string
  /** Placeholder for end date input */
  endPlaceholder?: string
  /** Enable time selection (need for internal logic) */
  showTime?: boolean
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<DateRangePickerProps>(), {
  modelValue: () => ({ start: null, end: null }),
  minDate: undefined,
  maxDate: undefined,
  maxSpanDays: undefined,
  startPlaceholder: undefined,
  endPlaceholder: undefined,
  showTime: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: DateRange]
  'change': [value: DateRange]
}>()

const T = useTranslations('components.ui.DateRangePicker')

// Internal buffer for date values (only emitted on panel hide or clear)
const startDate = ref<Date | null>(props.modelValue?.start ?? null)
const endDate = ref<Date | null>(props.modelValue?.end ?? null)

// Sync buffer with external prop changes
watch(() => props.modelValue, val => {
  startDate.value = val?.start ?? null
  endDate.value = val?.end ?? null
})

// Emit buffered range to parent
function emitRange () {
  const newRange: DateRange = {
    start: startDate.value,
    end: endDate.value,
  }
  emit('update:modelValue', newRange)
  emit('change', newRange)
}

// Handle start date change (buffer only, emit immediately on clear)
function handleStartUpdate (value: Date | Date[] | (Date | null)[] | null | undefined) {
  const date = (value instanceof Date ? value : null) as Date | null
  startDate.value = date
  if (date === null) emitRange()
}

// Handle end date change (buffer only, emit immediately on clear)
function handleEndUpdate (value: Date | Date[] | (Date | null)[] | null | undefined) {
  const date = (value instanceof Date ? value : null) as Date | null
  // If showTime is disabled, set end time to end of day
  if (date && !props.showTime) {
    const adjusted = new Date(date)
    adjusted.setHours(23, 59, 59, 999)
    endDate.value = adjusted
  } else {
    endDate.value = date
  }
  if (date === null) emitRange()
}

// Emit when picker panel hides (user confirmed selection)
function handlePickerHide () {
  emitRange()
}

// Helper: get the earlier/later of two dates
function earlierDate (a: Date, b: Date): Date {
  return a < b ? a : b
}
function laterDate (a: Date, b: Date): Date {
  return a > b ? a : b
}

// Helper: add days to a date
function addDays (date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// Combine two optional dates with a comparator (earlier/later)
function combineDates (a: Date | undefined, b: Date | undefined, pick: (a: Date, b: Date) => Date): Date | undefined {
  if (a && b) return pick(a, b)
  return a ?? b
}

// Start picker constraints
const startMinDate = computed(() =>
  combineDates(props.minDate, props.maxSpanDays && endDate.value ? addDays(endDate.value, -props.maxSpanDays) : undefined, laterDate),
)
const startMaxDate = computed(() =>
  combineDates(endDate.value ?? undefined, props.maxDate, earlierDate),
)

// End picker constraints
const endMinDate = computed(() =>
  combineDates(startDate.value ?? undefined, props.minDate, laterDate),
)
const endMaxDate = computed(() =>
  combineDates(props.maxDate, props.maxSpanDays && startDate.value ? addDays(startDate.value, props.maxSpanDays) : undefined, earlierDate),
)

// Computed placeholders with i18n fallback
const computedStartPlaceholder = computed(() => props.startPlaceholder ?? T('startPlaceholder'))
const computedEndPlaceholder = computed(() => props.endPlaceholder ?? T('endPlaceholder'))
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- Start date picker: $attrs first, then override with specific props -->
    <PrimeDatePicker
      :modelValue="startDate"
      v-bind="$attrs"
      showIcon
      showClear
      showButtonBar
      fluid
      :showTime="showTime"
      :dateFormat="T('dateFormat')"
      :minDate="startMinDate"
      :maxDate="startMaxDate"
      :placeholder="computedStartPlaceholder"
      :manualInput="false"
      @update:modelValue="handleStartUpdate"
      @hide="handlePickerHide"
    />

    <!-- Separator -->
    <span class="shrink-0 text-muted-color">
      {{ T('to') }}
    </span>

    <!-- End date picker: $attrs first, then override with specific props -->
    <PrimeDatePicker
      :modelValue="endDate"
      v-bind="$attrs"
      showIcon
      showClear
      showButtonBar
      fluid
      :showTime="showTime"
      :dateFormat="T('dateFormat')"
      :minDate="endMinDate"
      :maxDate="endMaxDate"
      :placeholder="computedEndPlaceholder"
      :manualInput="false"
      @update:modelValue="handleEndUpdate"
      @hide="handlePickerHide"
    />
  </div>
</template>
