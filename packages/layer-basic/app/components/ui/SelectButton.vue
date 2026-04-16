<script setup lang="ts">
import type { SelectButtonProps as BaseSelectButtonProps } from 'primevue/selectbutton'

export interface SelectButtonProps extends /* @vue-ignore */ BaseSelectButtonProps {}

defineProps<SelectButtonProps>()
</script>

<template>
  <PrimeSelectButton
    optionLabel="label"
    optionValue="value"
    :allowEmpty="false"
  >
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
  </PrimeSelectButton>
</template>
