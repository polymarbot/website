<script setup lang="ts">
const props = withDefaults(defineProps<{
  text: string
  offset?: number
}>(), {
  offset: 0,
})

const parent = shallowRef<HTMLElement | null>(null)
const child = shallowRef<HTMLElement | null>(null)
const str = ref('')

watch(
  () => props.text,
  () => truncate(),
)

onLifecycleSwitch(
  () => {
    truncate()
    window.addEventListener('resize', () => truncate())
  },
  () => {
    window.removeEventListener('resize', () => truncate())
  },
)

let truncateCanceller = { value: false }
async function truncate (canceller: typeof truncateCanceller = { value: false }) {
  truncateCanceller.value = true
  truncateCanceller = canceller
  if (!parent.value || !child.value) return
  const { text, offset } = props
  str.value = text
  await nextTick()
  if (canceller.value) return
  let i = 0
  const j = offset >= 0 ? offset : 0
  while (child.value.clientWidth > parent.value.clientWidth) {
    i++
    str.value = text.slice(0, -(j + i)) + '...' + (j > 0 ? text.slice(-j) : '')
    await nextTick()
    if (canceller.value) return
  }
}
</script>

<template>
  <div ref="parent">
    <div
      ref="child"
      class="min-w-max whitespace-nowrap"
      v-text="str"
    />
  </div>
</template>
