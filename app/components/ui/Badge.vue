<script setup lang="ts">
import type { BadgeProps as BaseBadgeProps } from 'primevue/badge'

export interface BadgeProps extends /* @vue-ignore */ BaseBadgeProps {}

defineProps<BadgeProps>()
</script>

<template>
  <PrimeBadge>
    <template
      v-for="name in Object.keys($slots)"
      :key="name"
      #[name]="slotData"
    >
      <slot
        :name="name"
        v-bind="slotData ?? {}"
      />
    </template>
  </PrimeBadge>
</template>
