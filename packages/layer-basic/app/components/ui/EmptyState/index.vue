<script setup lang="ts">
interface Props {
  /**
   * Full icon class names (e.g., 'pi-inbox text-4xl')
   * @default 'pi-inbox text-4xl'
   */
  icon?: string
  /**
   * Message to display
   */
  message?: string
  /**
   * Additional classes for the container
   */
  class?: ClassValue
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'pi-inbox text-4xl',
  message: undefined,
  class: undefined,
})

const T = useTranslations('components.ui.EmptyState')
</script>

<template>
  <div
    :class="cn(`
      flex flex-col items-center justify-center gap-3 text-muted-color
    `, props.class)"
  >
    <i :class="cn('pi', icon)" />
    <slot>
      <p class="text-center whitespace-pre-line">
        {{ message || T('defaultMessage') }}
      </p>
    </slot>
  </div>
</template>
