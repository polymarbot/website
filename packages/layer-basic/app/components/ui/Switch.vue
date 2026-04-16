<script setup lang="ts">
import type { ToggleSwitchProps as BaseSwitchProps } from 'primevue/toggleswitch'

export interface SwitchProps extends /* @vue-ignore */ BaseSwitchProps {}

defineProps<SwitchProps>()
</script>

<template>
  <PrimeToggleSwitch />
</template>
