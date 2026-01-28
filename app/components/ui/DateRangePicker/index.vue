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
  startPlaceholder: undefined,
  endPlaceholder: undefined,
  showTime: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: DateRange]
  /** Emitted when date range changes */
  'change': [value: DateRange]
}>()

const T = useTranslations('components.ui.DateRangePicker')

// Internal state for start and end dates
const startDate = computed({
  get: () => props.modelValue?.start ?? null,
  set: (value: Date | null) => {
    const newRange: DateRange = {
      start: value,
      end: props.modelValue?.end ?? null,
    }
    emit('update:modelValue', newRange)
    emit('change', newRange)
  },
})

const endDate = computed({
  get: () => props.modelValue?.end ?? null,
  set: (value: Date | null) => {
    // If showTime is disabled, set end time to end of day
    let adjustedValue = value
    if (value && !props.showTime) {
      adjustedValue = new Date(value)
      adjustedValue.setHours(23, 59, 59, 999)
    }
    const newRange: DateRange = {
      start: props.modelValue?.start ?? null,
      end: adjustedValue,
    }
    emit('update:modelValue', newRange)
    emit('change', newRange)
  },
})

// Computed constraints: start cannot be after end, end cannot be before start
const startMaxDate = computed(() => {
  // Use the earlier of: endDate or props.maxDate
  if (endDate.value && props.maxDate) {
    return endDate.value < props.maxDate ? endDate.value : props.maxDate
  }
  return endDate.value ?? props.maxDate
})

const endMinDate = computed(() => {
  // Use the later of: startDate or props.minDate
  if (startDate.value && props.minDate) {
    return startDate.value > props.minDate ? startDate.value : props.minDate
  }
  return startDate.value ?? props.minDate
})

// Computed placeholders with i18n fallback
const computedStartPlaceholder = computed(() => props.startPlaceholder ?? T('startPlaceholder'))
const computedEndPlaceholder = computed(() => props.endPlaceholder ?? T('endPlaceholder'))
</script>

<template>
  <div class="flex items-center gap-2">
    <!-- Start date picker: $attrs first, then override with specific props -->
    <PrimeDatePicker
      v-model="startDate"
      v-bind="$attrs"
      showIcon
      showClear
      showButtonBar
      fluid
      :showTime="showTime"
      :dateFormat="T('dateFormat')"
      :minDate="minDate"
      :maxDate="startMaxDate"
      :placeholder="computedStartPlaceholder"
      :manualInput="false"
    />

    <!-- Separator -->
    <span class="shrink-0 text-muted-color">
      {{ T('to') }}
    </span>

    <!-- End date picker: $attrs first, then override with specific props -->
    <PrimeDatePicker
      v-model="endDate"
      v-bind="$attrs"
      showIcon
      showClear
      showButtonBar
      fluid
      :showTime="showTime"
      :dateFormat="T('dateFormat')"
      :minDate="endMinDate"
      :maxDate="maxDate"
      :placeholder="computedEndPlaceholder"
      :manualInput="false"
    />
  </div>
</template>
