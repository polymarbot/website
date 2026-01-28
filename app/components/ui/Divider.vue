<script setup lang="ts">
import type { DividerProps as BaseDividerProps } from 'primevue/divider'

export interface DividerProps extends /* @vue-ignore */ BaseDividerProps {}

defineProps<DividerProps>()
</script>

<template>
  <PrimeDivider>
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
  </PrimeDivider>
</template>
