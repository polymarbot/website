<script setup lang="ts">
import type { MessageProps as BaseMessageProps } from 'primevue/message'

export interface MessageProps extends /* @vue-ignore */ BaseMessageProps {
  // Non-passthrough prop: needs internal processing for class merging
  class?: ClassValue
  icon?: string
  severity?: 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast'
}

const props = withDefaults(defineProps<MessageProps>(), {
  class: undefined,
  icon: undefined,
  severity: 'info',
})

// Default icons for each severity level
const severityIconMap: Record<string, string> = {
  success: 'pi pi-check-circle',
  info: 'pi pi-info-circle',
  warn: 'pi pi-exclamation-triangle',
  error: 'pi pi-times-circle',
  secondary: 'pi pi-info-circle',
  contrast: 'pi pi-info-circle',
}

const defaultIcon = computed(() => {
  if (props.icon) return props.icon
  return severityIconMap[props.severity]
})

const mergedClass = computed(() => cn('m-px whitespace-pre-line', props.class))
</script>

<template>
  <PrimeMessage
    :icon="defaultIcon"
    :severity="severity"
    :class="mergedClass"
    :pt="{ icon: { class: 'self-start' }}"
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
  </PrimeMessage>
</template>
