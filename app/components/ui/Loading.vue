<script setup lang="ts">
import type { ProgressSpinnerProps as BaseLoadingProps } from 'primevue/progressspinner'

export interface LoadingProps extends /* @vue-ignore */ BaseLoadingProps {}

defineProps<LoadingProps>()
</script>

<template>
  <PrimeProgressSpinner
    class="size-16"
    strokeWidth="5"
    fill="transparent"
  />
</template>
