<script setup lang="ts">
import type { InputTextProps as BaseInputProps } from 'primevue/inputtext'
import type { StyleValue } from 'vue'

export interface InputProps extends /* @vue-ignore */ BaseInputProps {
  modelValue?: string
  /** Enable password manager autofill (1Password, etc.). Disabled by default. */
  autofill?: boolean
  readonly?: boolean
  disabled?: boolean
  /** Class for root element */
  class?: ClassValue
  /** Style for root element */
  style?: StyleValue
}

defineOptions({ inheritAttrs: false })

const props = defineProps<InputProps>()

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
  'change': [value: string | undefined]
}>()

const model = computed({
  // @ts-expect-error TypeScript can't infer that modelValue can be undefined
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const showClearButton = computed(() => !!model.value && !props.readonly && !props.disabled)

function handleChange (event: Event) {
  const target = event.target as HTMLInputElement
  emit('change', target.value)
}

function clearInput () {
  model.value = undefined
  emit('change', undefined)
}
</script>

<template>
  <PrimeIconField
    :class="props.class"
    :style="props.style"
  >
    <PrimeInputText
      v-model="model"
      v-bind="$attrs"
      :readonly="readonly"
      :disabled="disabled"
      :data-1p-ignore="autofill ? undefined : true"
      :autocomplete="autofill ? undefined : 'off'"
      fluid
      @change="handleChange"
    />
    <PrimeInputIcon
      v-if="showClearButton"
      class="end-2 mt-0 -translate-y-1/2"
    >
      <Button
        icon="pi pi-times"
        severity="secondary"
        text
        rounded
        size="small"
        class="size-8"
        @click="clearInput"
      />
    </PrimeInputIcon>
  </PrimeIconField>
</template>
