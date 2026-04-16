<script setup lang="ts">
/**
 * IntersectionChecker - A component that observes element visibility using IntersectionObserver
 *
 * Wraps content and triggers a callback when the element becomes visible in the viewport.
 * Useful for lazy loading, infinite scroll, or tracking element visibility.
 */

interface Props {
  /** Disable the intersection observer */
  disabled?: boolean
  /**
   * IntersectionObserver configuration options:
   * - root: Element used as the viewport for checking visibility (default: null - browser viewport)
   * - rootMargin: Margin around root element (CSS margin syntax, e.g., "0px 0px -100px 0px")
   * - threshold: Number or array of numbers indicating at what percentage of visibility the callback should execute (0.0 to 1.0)
   */
  options?: IntersectionObserverInit // eslint-disable-line no-undef
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  options: undefined,
})

const emit = defineEmits<{
  /** Emitted when element becomes visible */
  show: []
}>()

const elementRef = shallowRef<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

function createObserver () {
  if (!elementRef.value) return

  observer = new IntersectionObserver(entries => {
    const entry = entries[0]
    if (entry?.isIntersecting && !props.disabled) {
      emit('show')
    }
  }, props.options)

  observer.observe(elementRef.value)
}

watch(
  () => props.options,
  () => {
    observer?.disconnect()
    createObserver()
  },
  { deep: true },
)

onMounted(() => {
  createObserver()
})

onUnmounted(() => {
  observer?.disconnect()
})
</script>

<template>
  <div ref="elementRef">
    <slot />
  </div>
</template>
