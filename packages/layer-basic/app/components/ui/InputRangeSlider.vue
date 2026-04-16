<script setup lang="ts">
import type { InputRangeProps } from './InputRange.vue'

export interface InputRangeSliderProps extends /* @vue-ignore */ InputRangeProps {
  start?: number
  end?: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<InputRangeSliderProps>(), {
  start: undefined,
  end: undefined,
  min: 0,
  max: 100,
  step: 1,
})

const emit = defineEmits<{
  'update:start': [value: number]
  'update:end': [value: number]
}>()

const start = computed({
  get: () => props.start ?? 0,
  set: value => emit('update:start', value),
})

const end = computed({
  get: () => props.end ?? 0,
  set: value => emit('update:end', value),
})

// Range value for slider [start, end]
const rangeValue = computed({
  get: () => [ start.value, end.value ],
  set: (value: number[]) => {
    start.value = value[0] ?? props.min
    end.value = value[1] ?? props.max
  },
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <InputRange
      v-model:start="start"
      v-model:end="end"
      v-bind="$attrs"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
    />
    <Slider
      v-model="rangeValue"
      range
      class="m-3"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
    />
  </div>
</template>
