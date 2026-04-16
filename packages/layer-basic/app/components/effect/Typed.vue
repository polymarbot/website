<script setup lang="ts">
import Typed from 'typed.js'

const props = withDefaults(defineProps<{
  strings?: string[]
  startDelay?: number
  backDelay?: number
  loop?: boolean
}>(), {
  strings: () => ([]),
  startDelay: 0,
  backDelay: 3000,
  loop: false,
})

const isActive = ref(false)
const typedRef = shallowRef<HTMLElement | null>(null)
const typedStringsRef = shallowRef<HTMLElement | null>(null)
let typed: Typed | null = null
onLifecycleSwitch(createTyped, destroyTyped)
watch(() => props.strings, createTyped)

function createTyped () {
  destroyTyped()

  if (!typedRef.value) return

  const options: ConstructorParameters<typeof Typed>[1] = {
    startDelay: props.startDelay,
    backDelay: props.backDelay,
    typeSpeed: 50,
    loop: props.loop,
    cursorChar: '_',
  }

  if (props.strings.length) {
    options.strings = props.strings
  } else {
    options.stringsElement = typedStringsRef.value as Element
  }

  typed = new Typed(typedRef.value, options)
  isActive.value = true
}

function destroyTyped () {
  typed?.destroy()
}
</script>

<template>
  <div>
    <div
      v-if="!isActive"
      ref="typedStringsRef"
      class="invisible inline"
    >
      <template v-if="strings.length">
        <div>{{ strings[0] }}</div>
        <div
          v-for="(str, index) in strings.slice(1)"
          :key="index"
          class="hidden"
        >
          {{ str }}
        </div>
      </template>
      <slot v-else />
    </div>
    <div
      ref="typedRef"
      class="inline"
    />
  </div>
</template>
