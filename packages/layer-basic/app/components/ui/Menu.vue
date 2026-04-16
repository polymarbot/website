<script setup lang="ts">
import type { MenuProps as BaseMenuProps } from 'primevue/menu'
export type { MenuItem } from 'primevue/menuitem'

export interface MenuProps extends /* @vue-ignore */ BaseMenuProps {}

defineProps<MenuProps>()
</script>

<template>
  <PrimeMenu>
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
  </PrimeMenu>
</template>
