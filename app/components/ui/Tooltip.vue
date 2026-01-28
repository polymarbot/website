<script setup lang="ts">
import type { TooltipOptions } from 'primevue/tooltip'
import type { PopoverMethods } from 'primevue/popover'

export interface TooltipProps {
  /** Tooltip content text */
  text?: string
  /** Tooltip position */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /** Whether to disable the tooltip */
  disabled?: boolean
  /** Additional tooltip options */
  options?: Omit<TooltipOptions, 'value' | 'disabled'>
  /** HTML tag for the wrapper element */
  as?: string
  /** Custom class for the wrapper element */
  class?: ClassValue
  /** Custom class for the text content (tooltip/popover) */
  textClass?: ClassValue
}

const props = withDefaults(defineProps<TooltipProps>(), {
  text: undefined,
  position: 'top',
  disabled: false,
  options: undefined,
  as: 'span',
  class: undefined,
  textClass: undefined,
})

const { isMobile } = useDevice()
const popoverRef = ref<PopoverMethods | null>(null)

const wrapperClass = computed(() => cn('inline-block', props.class))
const textClassValue = computed(() => cn(props.textClass))

const tooltipValue = computed(() => {
  // If disabled or on mobile, return undefined to disable tooltip
  if (props.disabled || !props.text || isMobile.value) {
    return undefined
  }

  return {
    value: props.text,
    class: textClassValue.value,
    ...props.options,
  }
})

function onTouchStart (event: Event) {
  if (isMobile.value && props.text && !props.disabled) {
    popoverRef.value?.show(event)
  }
}

// Exposed methods for manual control
function showPopover (event: Event) {
  popoverRef.value?.show(event)
}

function hidePopover () {
  popoverRef.value?.hide()
}

defineExpose({
  show: showPopover,
  hide: hidePopover,
})
</script>

<template>
  <!-- Top position -->
  <component
    :is="as"
    v-if="position === 'top'"
    v-tooltip.top="tooltipValue"
    :class="wrapperClass"
    @touchstart="onTouchStart"
  >
    <slot />
    <PrimePopover
      v-if="isMobile && text && !disabled"
      ref="popoverRef"
      class="mx-2"
    >
      <span
        :class="textClassValue"
        v-html="text"
      />
    </PrimePopover>
  </component>

  <!-- Bottom position -->
  <component
    :is="as"
    v-else-if="position === 'bottom'"
    v-tooltip.bottom="tooltipValue"
    :class="wrapperClass"
    @touchstart="onTouchStart"
  >
    <slot />
    <PrimePopover
      v-if="isMobile && text && !disabled"
      ref="popoverRef"
      class="mx-2"
    >
      <span
        :class="textClassValue"
        v-html="text"
      />
    </PrimePopover>
  </component>

  <!-- Left position -->
  <component
    :is="as"
    v-else-if="position === 'left'"
    v-tooltip.left="tooltipValue"
    :class="wrapperClass"
    @touchstart="onTouchStart"
  >
    <slot />
    <PrimePopover
      v-if="isMobile && text && !disabled"
      ref="popoverRef"
      class="mx-2"
    >
      <span
        :class="textClassValue"
        v-html="text"
      />
    </PrimePopover>
  </component>

  <!-- Right position -->
  <component
    :is="as"
    v-else
    v-tooltip.right="tooltipValue"
    :class="wrapperClass"
    @touchstart="onTouchStart"
  >
    <slot />
    <PrimePopover
      v-if="isMobile && text && !disabled"
      ref="popoverRef"
      class="mx-2"
    >
      <span
        :class="textClassValue"
        v-html="text"
      />
    </PrimePopover>
  </component>
</template>
