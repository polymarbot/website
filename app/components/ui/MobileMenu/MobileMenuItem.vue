<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

export interface MobileMenuItemProps {
  beforeIcon?: string
  afterIcon?: string
  title: string
  subtitle?: string
  to?: RouteLocationRaw
  href?: string
  target?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<MobileMenuItemProps>(), {
  beforeIcon: undefined,
  afterIcon: undefined,
  subtitle: undefined,
  to: undefined,
  href: undefined,
  target: undefined,
  disabled: false,
})

defineEmits<{
  click: [event: MouseEvent]
}>()

// Auto detect external link and set target
const isExternal = computed(() => (props.href ? isExternalLink(props.href) : false))
const effectiveTarget = computed(() => {
  if (props.target) return props.target
  return isExternal.value ? '_blank' : undefined
})
const effectiveRel = computed(() => {
  return effectiveTarget.value === '_blank' ? 'noopener noreferrer' : undefined
})

// Default after icon based on link type
const effectiveAfterIcon = computed(() => {
  if (props.afterIcon) return props.afterIcon
  if (props.href && effectiveTarget.value === '_blank') return 'pi pi-external-link'
  if (props.to || props.href) return 'pi pi-chevron-right'
  return undefined
})

const itemClass = computed(() => [
  'group flex w-full items-center justify-between px-4 py-3 text-left transition-colors',
  '[&:not(:first-child)]:border-t [&:not(:first-child)]:border-surface',
  props.disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-highlight-emphasis active:bg-highlight-emphasis',
])
</script>

<template>
  <!-- Internal route link -->
  <WebLink
    v-if="to"
    :to="to"
    :class="itemClass"
    unstyled
    @click="$emit('click', $event)"
  >
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <i
        v-if="beforeIcon"
        :class="beforeIcon"
        class="
          text-lg text-muted-color transition-colors
          group-hover:text-surface-0
          group-active:text-surface-0
        "
      />
      <span class="truncate">
        {{ title }}
      </span>
    </div>
    <div class="flex items-center gap-2">
      <span
        v-if="subtitle"
        class="
          text-sm text-muted-color transition-colors
          group-hover:text-surface-0
          group-active:text-surface-0
        "
      >
        {{ subtitle }}
      </span>
      <i
        v-if="effectiveAfterIcon"
        :class="effectiveAfterIcon"
        class="
          text-sm text-muted-color transition-colors
          group-hover:text-surface-0
          group-active:text-surface-0
        "
      />
    </div>
  </WebLink>

  <!-- External link -->
  <a
    v-else-if="href"
    :href="href"
    :target="effectiveTarget"
    :rel="effectiveRel"
    :class="itemClass"
    @click="$emit('click', $event)"
  >
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <i
        v-if="beforeIcon"
        :class="beforeIcon"
        class="
          text-lg text-muted-color transition-colors
          group-hover:text-surface-0
          group-active:text-surface-0
        "
      />
      <span class="truncate">
        {{ title }}
      </span>
    </div>
    <div class="flex items-center gap-2">
      <span
        v-if="subtitle"
        class="
          text-sm text-muted-color transition-colors
          group-hover:text-surface-0
          group-active:text-surface-0
        "
      >
        {{ subtitle }}
      </span>
      <i
        v-if="effectiveAfterIcon"
        :class="effectiveAfterIcon"
        class="
          text-sm text-muted-color transition-colors
          group-hover:text-surface-0
          group-active:text-surface-0
        "
      />
    </div>
  </a>

  <!-- Button (no link) -->
  <button
    v-else
    :disabled="disabled"
    :class="itemClass"
    @click="$emit('click', $event)"
  >
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <i
        v-if="beforeIcon"
        :class="beforeIcon"
        class="
          text-lg text-muted-color transition-colors
          group-hover:text-surface-0
          group-active:text-surface-0
        "
      />
      <span class="truncate">
        {{ title }}
      </span>
    </div>
    <div class="flex items-center gap-2">
      <span
        v-if="subtitle"
        class="
          text-sm text-muted-color transition-colors
          group-hover:text-surface-0
          group-active:text-surface-0
        "
      >
        {{ subtitle }}
      </span>
      <i
        v-if="effectiveAfterIcon"
        :class="effectiveAfterIcon"
        class="
          text-sm text-muted-color transition-colors
          group-hover:text-surface-0
          group-active:text-surface-0
        "
      />
    </div>
  </button>
</template>
