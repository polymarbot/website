<script setup lang="ts">
import type { ButtonProps } from '../Button.vue'

export interface CopyButtonProps extends /* @vue-ignore */ ButtonProps {
  /** The text content to copy to clipboard */
  copy?: string
  /** Custom tooltip text shown before copy action */
  beforeCopyText?: string
  /** Custom tooltip text shown after successful copy */
  afterCopyText?: string
}

const props = defineProps<CopyButtonProps>()

defineOptions({ inheritAttrs: false })

const T = useTranslations('components.ui.CopyButton')

const isCopied = ref(false)

const tooltipText = computed(() => {
  if (isCopied.value) {
    return props.afterCopyText || T('copied')
  }
  return props.beforeCopyText || T('copyToClipboard')
})

async function copyToClipboard () {
  if (!props.copy) return

  try {
    await navigator.clipboard.writeText(props.copy)
  } catch (err) {
    console.error('Clipboard API failed, falling back to execCommand:', err)
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = props.copy
    textarea.style.position = 'absolute'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }

  isCopied.value = true
}

function resetCopiedState () {
  isCopied.value = false
}
</script>

<template>
  <Tooltip :text="tooltipText">
    <Button
      v-bind="$attrs"
      class="relative"
      :class="{ 'p-button-icon-only': !$slots.default }"
      @click="copyToClipboard"
      @mouseleave="resetCopiedState"
    >
      <div
        v-if="$slots.default"
        class="flex-1"
      >
        <slot />
      </div>

      <div class="pointer-events-none flex w-[1em] items-center justify-center">
        <Transition
          name="copy-icon-fade"
          mode="out-in"
        >
          <i
            v-if="isCopied"
            key="check"
            class="pi pi-check"
          />
          <i
            v-else
            key="copy"
            class="pi pi-copy"
          />
        </Transition>
      </div>

      <!-- Overlay to trigger tooltip re-show on click -->
      <Transition
        name="copy-icon-fade"
        mode="out-in"
      >
        <span
          v-if="isCopied"
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
.copy-icon-fade-enter-active,
.copy-icon-fade-leave-active {
  transition-duration: 200ms;
  transition-property: opacity, transform;
  transition-timing-function: ease;
}

.copy-icon-fade-enter-from,
.copy-icon-fade-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>
