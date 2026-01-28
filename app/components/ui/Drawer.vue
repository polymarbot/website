<script setup lang="ts">
import type { DrawerProps as BaseDrawerProps } from 'primevue/drawer'

export interface DrawerProps extends /* @vue-ignore */ Omit<BaseDrawerProps, 'visible'> {}

defineProps<DrawerProps>()
</script>

<template>
  <PrimeDrawer>
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
  </PrimeDrawer>
</template>
