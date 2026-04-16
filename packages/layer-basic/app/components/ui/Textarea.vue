<script setup lang="ts">
import type { TextareaProps as BaseTextareaProps } from 'primevue/textarea'

export interface TextareaProps extends /* @vue-ignore */ BaseTextareaProps {
  /** Enable password manager autofill (1Password, etc.). Disabled by default. */
  autofill?: boolean
}

defineProps<TextareaProps>()

const emit = defineEmits<{
  change: [value: string]
}>()

function handleChange (event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('change', target.value)
}
</script>

<template>
  <PrimeTextarea
    :data-1p-ignore="autofill ? undefined : true"
    :autocomplete="autofill ? undefined : 'off'"
    rows="1"
    autoResize
    fluid
    @change="handleChange"
  />
</template>
