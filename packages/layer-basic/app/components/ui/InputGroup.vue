<script setup lang="ts">
import type { InputGroupProps as PrimeInputGroupProps } from 'primevue/inputgroup'

export interface InputGroupProps extends /* @vue-ignore */ PrimeInputGroupProps {}

defineProps<InputGroupProps>()
</script>

<template>
  <PrimeInputGroup>
    <PrimeInputGroupAddon v-if="$slots.prepend">
      <slot name="prepend" />
    </PrimeInputGroupAddon>
    <slot />
    <PrimeInputGroupAddon v-if="$slots.append">
      <slot name="append" />
    </PrimeInputGroupAddon>
  </PrimeInputGroup>
</template>
