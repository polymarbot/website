<script setup lang="ts">
import type { DatePickerProps as BaseDatePickerProps } from 'primevue/datepicker'

export interface DatePickerProps extends /* @vue-ignore */ Omit<BaseDatePickerProps, 'modelValue' | 'dateFormat' | 'selectionMode'> {
  /** Date value - single Date or Date[] for range mode */
  modelValue?: Date | Date[] | null
  /** Custom date format, overrides locale default */
  dateFormat?: string
  /** Selection mode */
  selectionMode?: 'single' | 'multiple' | 'range'
}

const props = withDefaults(defineProps<DatePickerProps>(), {
  modelValue: undefined,
  dateFormat: undefined,
  selectionMode: 'single',
})

const emit = defineEmits<{
  'update:modelValue': [value: Date | Date[] | null]
  /** Emitted when selection is complete (range mode: both dates selected, or cleared) */
  'change': [value: Date | Date[] | null]
}>()

const T = useTranslations('components.ui.DatePicker')

// Compute date format based on locale
const computedDateFormat = computed(() => props.dateFormat ?? T('dateFormat'))

// Use computed get/set for v-model
const model = computed({
  get: () => props.modelValue,
  set: (value: Date | Date[] | null | undefined) => {
    // Handle cleared value
    if (!value) {
      emit('update:modelValue', null)
      emit('change', null)
      return
    }

    // For range mode, adjust end date to end of day
    if (props.selectionMode === 'range' && Array.isArray(value) && value.length === 2) {
      const [ start, end ] = value
      if (start && end) {
        const adjustedEnd = new Date(end)
        adjustedEnd.setHours(23, 59, 59, 999)
        const adjustedValue = [ start, adjustedEnd ] as Date[]
        emit('update:modelValue', adjustedValue)
        emit('change', adjustedValue)
        return
      }
      // Range incomplete, only update model without triggering change
      emit('update:modelValue', value)
      return
    }

    // For single/multiple mode, always emit change
    emit('update:modelValue', value)
    emit('change', value)
  },
})
</script>

<template>
  <PrimeDatePicker
    v-model="model"
    showIcon
    showClear
    showButtonBar
    fluid
    :selectionMode="selectionMode"
    :dateFormat="computedDateFormat"
  >
    <template
      v-for="name in Object.keys($slots)"
      :key="name"
      #[name]="slotData"
    >
      <slot
        :name="name"
        v-bind="slotData ?? {}"
      />
    </template>
  </PrimeDatePicker>
</template>
