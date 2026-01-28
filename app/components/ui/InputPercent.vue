<script setup lang="ts">
import type { InputNumberProps } from './InputNumber.vue'

export interface InputPercentProps extends /* @vue-ignore */ InputNumberProps {
  modelValue?: number
}

defineOptions({ inheritAttrs: false })

const props = defineProps<InputPercentProps>()

const emit = defineEmits<{
  'update:modelValue': [value: number | undefined]
}>()

const model = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
</script>

<template>
  <PrimeInputGroup>
    <InputNumber
      v-model="model"
      :min="0"
      :max="100"
      :step="1"
      fluid
      v-bind="$attrs"
    />
    <PrimeInputGroupAddon>%</PrimeInputGroupAddon>
  </PrimeInputGroup>
</template>
