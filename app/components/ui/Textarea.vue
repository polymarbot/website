<script setup lang="ts">
import type { TextareaProps as BaseTextareaProps } from 'primevue/textarea'

export interface TextareaProps extends /* @vue-ignore */ BaseTextareaProps {
  // Non-passthrough prop: only used internally
  class?: ClassValue
  /** Enable password manager autofill (1Password, etc.). Disabled by default. */
  autofill?: boolean
}

const props = withDefaults(defineProps<TextareaProps>(), {
  class: undefined,
  autofill: false,
})

const emit = defineEmits<{
  change: [value: string]
}>()

function handleChange (event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('change', target.value)
}

const mergedClass = computed(() => cn('m-px whitespace-pre-line', props.class))
</script>

<template>
  <PrimeTextarea
    :data-1p-ignore="autofill ? undefined : true"
    :autocomplete="autofill ? undefined : 'off'"
    :class="mergedClass"
    rows="1"
    autoResize
    fluid
    @change="handleChange"
  />
</template>
