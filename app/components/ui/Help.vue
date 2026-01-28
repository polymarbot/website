<script setup lang="ts">
import type { TooltipOptions } from 'primevue/tooltip'

export interface HelpProps {
  /** Tooltip content text */
  text?: string
  /** Tooltip position */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /** Additional tooltip options */
  tooltipOptions?: Omit<TooltipOptions, 'value'>
  /** Custom class */
  class?: ClassValue
}

const props = withDefaults(defineProps<HelpProps>(), {
  text: undefined,
  position: 'top',
  tooltipOptions: undefined,
  class: undefined,
})

const mergedClass = computed(() => {
  return cn(
    `
      flex items-center justify-center text-muted-color transition-colors
      hover:text-color-emphasis
    `,
    props.class,
  )
})
</script>

<template>
  <Tooltip
    :text="text"
    :position="position"
    :options="tooltipOptions"
  >
    <div :class="mergedClass">
      <slot>
        <i class="pi pi-question-circle cursor-help" />
      </slot>
    </div>
  </Tooltip>
</template>
