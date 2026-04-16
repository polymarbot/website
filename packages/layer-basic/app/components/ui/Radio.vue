<script setup lang="ts">
import type { RadioButtonProps as BaseRadioProps } from 'primevue/radiobutton'

export interface RadioProps extends /* @vue-ignore */ BaseRadioProps {}

defineProps<RadioProps>()
</script>

<template>
  <PrimeRadioButton />
</template>
