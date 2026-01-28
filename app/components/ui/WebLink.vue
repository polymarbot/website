<script setup lang="ts">
import type { NuxtLinkProps } from '#app'
import type { RouteLocationRaw } from 'vue-router'

export interface WebLinkProps extends NuxtLinkProps {
  unstyled?: boolean
  class?: ClassValue
}

const props = withDefaults(defineProps<WebLinkProps>(), {
  class: undefined,
  // Fixed: [NuxtLink] `noRel` and `rel` cannot be used together. `rel` will be ignored.
  noRel: undefined,
  // Fixed: [NuxtLink] `noPrefetch` and `prefetch` cannot be used together. `prefetch` will be ignored.
  noPrefetch: undefined,
})

const isExternal = computed(() => props.href ? isExternalLink(props.href) : false)

// Compute the final destination (supports both href string and to route object)
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

// Filter out href and to from props to avoid warning
const filteredProps = computed(() => {
  const { href: _href, to: _to, ...rest } = props
  return rest
})

// Merge default class with external class
const mergedClass = computed(() => {
  if (props.unstyled) {
    return props.class
  }
  return cn('text-info underline', props.class)
})
</script>

<template>
  <NuxtLink
    v-bind="filteredProps"
    :to="finalTo"
    :target="finalTarget"
    :rel="finalRel"
    :class="mergedClass"
  >
    <slot />
  </NuxtLink>
</template>
