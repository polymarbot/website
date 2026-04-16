<script setup lang="ts">
import type { ButtonProps } from '../Button.vue'

export interface PasteButtonProps extends /* @vue-ignore */ ButtonProps {
  /** Custom tooltip text shown before paste action */
  beforePasteText?: string
  /** Custom tooltip text shown after successful paste */
  afterPasteText?: string
}

const props = defineProps<PasteButtonProps>()

defineOptions({ inheritAttrs: false })

const emit = defineEmits<{
  pasted: [text: string]
}>()

const T = useTranslations('components.ui.PasteButton')

const isPasted = ref(false)

const tooltipText = computed(() => {
  if (isPasted.value) {
    return props.afterPasteText || T('pasted')
  }
  return props.beforePasteText || T('pasteFromClipboard')
})

async function pasteFromClipboard () {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      emit('pasted', text)
      isPasted.value = true
    }
  } catch (err) {
    console.error('Failed to read clipboard:', err)
  }
}

function resetPastedState () {
  isPasted.value = false
}
</script>

<template>
  <Tooltip :text="tooltipText">
    <Button
      v-bind="$attrs"
      class="relative"
      :class="{ 'p-button-icon-only': !$slots.default }"
      @click="pasteFromClipboard"
      @mouseleave="resetPastedState"
    >
      <div
        v-if="$slots.default"
        class="flex-1"
      >
        <slot />
      </div>

      <div class="pointer-events-none flex w-[1em] items-center justify-center">
        <Transition
          name="paste-icon-fade"
          mode="out-in"
        >
          <i
            v-if="isPasted"
            key="check"
            class="pi pi-check"
          />
          <i
            v-else
            key="paste"
            class="pi pi-clipboard"
          />
        </Transition>
      </div>

      <!-- Overlay to trigger tooltip re-show on click -->
      <Transition
        name="paste-icon-fade"
        mode="out-in"
      >
        <span
          v-if="isPasted"
          class="absolute inset-0"
        />
        <span
          v-else
          class="absolute inset-0"
        />
      </Transition>
    </Button>
  </Tooltip>
</template>

<style scoped>
.paste-icon-fade-enter-active,
.paste-icon-fade-leave-active {
  transition-duration: 200ms;
  transition-property: opacity, transform;
  transition-timing-function: ease;
}

.paste-icon-fade-enter-from,
.paste-icon-fade-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>
