<script setup lang="ts">
import type { ProgressBarProps as BaseProgressBarProps } from 'primevue/progressbar'

export interface ProgressBarProps extends /* @vue-ignore */ BaseProgressBarProps {}

defineProps<ProgressBarProps>()
</script>

<template>
  <PrimeProgressBar>
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
  </PrimeProgressBar>
</template>
