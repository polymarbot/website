<script setup lang="ts">
import type { InputPercentProps } from './InputPercent.vue'

export interface InputPercentSliderProps extends /* @vue-ignore */ InputPercentProps {
  modelValue?: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<InputPercentSliderProps>(), {
  modelValue: undefined,
  min: 0,
  max: 100,
  step: 1,
})

const emit = defineEmits<{
  'update:modelValue': [value: number | undefined]
}>()

const model = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <InputPercent
      v-model="model"
      v-bind="$attrs"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
    />
    <Slider
      v-model="model"
      class="m-3"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
    />
  </div>
</template>
