<script setup lang="ts">
import type { ChipProps as BaseChipProps } from 'primevue/chip'

export interface ChipProps extends /* @vue-ignore */ BaseChipProps {}

defineProps<ChipProps>()
</script>

<template>
  <PrimeChip>
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
  </PrimeChip>
</template>
