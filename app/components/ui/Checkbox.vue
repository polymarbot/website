<script setup lang="ts">
import type { CheckboxProps as BaseCheckboxProps } from 'primevue/checkbox'

export interface CheckboxProps extends /* @vue-ignore */ BaseCheckboxProps {}

defineProps<CheckboxProps>()
</script>

<template>
  <PrimeCheckbox>
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
  </PrimeCheckbox>
</template>
