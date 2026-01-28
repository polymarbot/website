<script setup lang="ts">
export type NonProdPosition = 'top-left' | 'top-right' | 'bottom-right' | 'bottom-left'

const props = withDefaults(
  defineProps<{
    dev?: boolean
    stg?: boolean
    position?: NonProdPosition
  }>(),
  {
    dev: false,
    stg: false,
    position: 'top-left',
  },
)

const label = computed(() => {
  if (props.dev) return 'DEV'
  if (props.stg) return 'STG'
  return 'Beta'
})

const positionClasses = computed(() => {
  switch (props.position) {
    case 'top-left':
      return 'top-0 left-0 mt-5 ml-2 origin-top -translate-x-1/2 -translate-y-1/2 -rotate-45'
    case 'top-right':
      return 'top-0 right-0 mt-5 mr-2 origin-top translate-x-1/2 -translate-y-1/2 rotate-45'
    case 'bottom-right':
      return 'bottom-0 right-0 mb-5 mr-2 origin-bottom translate-x-1/2 translate-y-1/2 -rotate-45'
    case 'bottom-left':
      return 'bottom-0 left-0 mb-5 ml-2 origin-bottom -translate-x-1/2 translate-y-1/2 rotate-45'
    default:
      return 'top-0 left-0 mt-5 ml-2 origin-top -translate-x-1/2 -translate-y-1/2 -rotate-45'
  }
})

// Color classes for different environments (with sufficient contrast for accessibility)
const colorClasses = computed(() => {
  if (props.dev) return 'bg-red-600 dark:bg-red-500' // DEV: red
  if (props.stg) return 'bg-orange-600 dark:bg-orange-500' // STG: orange
  return 'bg-purple-600 dark:bg-purple-500' // Beta: purple
})
</script>

<template>
  <div
    v-if="label"
    class="
      pointer-events-none fixed z-100 w-full text-center text-sm font-semibold
      text-white
    "
    :class="[ positionClasses, colorClasses ]"
  >
    {{ label }}
  </div>
</template>
