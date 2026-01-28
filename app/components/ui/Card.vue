<script setup lang="ts">
import type { CardProps as BaseCardProps } from 'primevue/card'

export interface CardProps extends /* @vue-ignore */ BaseCardProps {}

defineProps<CardProps>()
</script>

<template>
  <PrimeCard>
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
  </PrimeCard>
</template>
