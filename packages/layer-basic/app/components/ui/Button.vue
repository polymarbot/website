<script setup lang="ts">
/**
 * Button Component
 *
 * PrimeButton has a known issue: using default slot breaks icon/loadingIcon rendering,
 * and defining icon prop locks button width causing slot content overflow.
 *
 * Solution: Extract icon, loadingIcon, label from props and render them manually
 * via default slot instead of passing to PrimeButton.
 *
 * Link Support:
 * - Pass `href` to render as a link
 * - Internal links use NuxtLink for client-side navigation
 * - External links (http/https) use <a> tag with target="_blank" and rel="noopener noreferrer"
 */
import type { ButtonProps as BaseButtonProps } from 'primevue/button'
import type { RouteLocationRaw } from 'vue-router'

export interface ButtonProps extends /* @vue-ignore */ BaseButtonProps {
  icon?: string
  iconPos?: 'left' | 'right' | 'top' | 'bottom'
  iconClass?: string | object
  label?: string
  loadingIcon?: string
  loading?: boolean
  disabled?: boolean
  href?: string
  to?: RouteLocationRaw
  target?: string
}

const props = withDefaults(defineProps<ButtonProps>(), {
  icon: undefined,
  iconPos: undefined,
  iconClass: undefined,
  label: undefined,
  loadingIcon: 'pi pi-spinner pi-spin',
  loading: false,
  disabled: false,
  href: undefined,
  to: undefined,
  target: undefined,
})

// Link handling
const isExternal = computed(() => props.href ? isExternalLink(props.href) : false)
const linkComponent = computed(() => {
  if (!props.href && !props.to) return undefined
  // Use NuxtLink for internal links, <a> for external
  return resolveComponent('NuxtLink')
})
const finalTo = computed<RouteLocationRaw | undefined>(() => {
  if (props.to) return props.to
  if (props.href) return props.href
  return undefined
})
const finalTarget = computed(() => {
  if (props.target) return props.target
  // Auto set _blank for external links
  return isExternal.value ? '_blank' : undefined
})
const finalRel = computed(() => {
  // Add security attrs for external links opening in new tab
  return finalTarget.value === '_blank' ? 'noopener noreferrer' : undefined
})

// Determine which icon to display based on loading state
const displayIcon = computed(() => {
  if (props.loading) {
    return props.loadingIcon
  }
  return props.icon
})

// Check if icon should be on the right side
const isIconRight = computed(() => props.iconPos === 'right' || props.iconPos === 'bottom')

// Check if icon should be displayed vertically (top/bottom)
const isIconVertical = computed(() => props.iconPos === 'top' || props.iconPos === 'bottom')
</script>

<template>
  <PrimeButton
    :as="linkComponent"
    :to="finalTo"
    :target="finalTarget"
    :rel="finalRel"
    :loading="loading"
    :disabled="loading || disabled"
    :class="{ 'flex-col': isIconVertical, 'p-button-icon-only': !!icon && !label && !$slots.default }"
  >
    <!-- Icon on left/top (default position) -->
    <i
      v-if="displayIcon && !isIconRight"
      :class="[ displayIcon, props.iconClass ]"
    />

    <!-- Label or default slot content -->
    <slot
      v-if="props.label || $slots.default"
    >
      {{ props.label }}
    </slot>

    <!-- Icon on right/bottom -->
    <i
      v-if="displayIcon && isIconRight"
      :class="[ displayIcon, props.iconClass ]"
    />
  </PrimeButton>
</template>
