<script setup lang="ts">
import type { SliderProps as BaseSliderProps } from 'primevue/slider'

export interface SliderProps extends /* @vue-ignore */ BaseSliderProps {}

defineProps<SliderProps>()
</script>

<template>
  <PrimeSlider />
</template>
