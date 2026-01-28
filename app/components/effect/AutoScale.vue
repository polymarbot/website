<script setup lang="ts">
const props = withDefaults(defineProps<{
  align?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'center' | 'bottom'
  allowZoomIn?: boolean
}>(), {
  align: 'center',
  verticalAlign: 'center',
})

const parent = shallowRef<HTMLElement | null>(null)
const child = shallowRef<HTMLElement | null>(null)
const scale = ref(1)

const flexAlign = computed(() => {
  switch (props.align) {
    case 'left':
      return 'flex-start'
    case 'right':
      return 'flex-end'
    default:
      return 'center'
  }
})

const flexVerticalAlign = computed(() => {
  switch (props.verticalAlign) {
    case 'top':
      return 'flex-start'
    case 'bottom':
      return 'flex-end'
    default:
      return 'center'
  }
})

const mo = new MutationObserver(resize)
const config = {
  attributes: true,
  attributeFilter: [
    'class',
    'id',
    'style',
  ],
  characterData: true,
  childList: true,
  subtree: true,
}

onMounted(() => {
  resize()
  mo.observe(child.value!, config)
  window.addEventListener('resize', resize)
})
onActivated(() => {
  resize()
  window.addEventListener('resize', resize)
})
onBeforeUnmount(() => {
  mo.disconnect()
  window.removeEventListener('resize', resize)
})
onDeactivated(() => {
  window.removeEventListener('resize', resize)
})

function resize () {
  if (!parent.value || !child.value) return

  const parentWidth = parent.value.clientWidth
  const parentHeight = parent.value.clientHeight
  const childWidth = child.value.clientWidth
  const childHeight = child.value.clientHeight

  const sx = parentWidth / childWidth
  const sy = parentHeight / childHeight
  if (props.allowZoomIn) scale.value = sx > sy ? sy : sx
  else scale.value = Math.min(1, sx > sy ? sy : sx)
}
</script>

<template>
  <div
    ref="parent"
    class="flex"
    :style="{
      'justify-content': flexAlign,
      'align-items': flexVerticalAlign,
    }"
  >
    <div
      ref="child"
      class="whitespace-nowrap"
      :style="{
        'transform': `scale(${scale})`,
        'transform-origin': [ align, verticalAlign ].join(' '),
      }"
    >
      <slot />
    </div>
  </div>
</template>
