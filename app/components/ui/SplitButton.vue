<script setup lang="ts">
import type { SplitButtonProps as BaseSplitButtonProps } from 'primevue/splitbutton'

export interface SplitButtonProps extends /* @vue-ignore */ BaseSplitButtonProps {}

defineProps<SplitButtonProps>()
</script>

<template>
  <PrimeSplitButton>
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
  </PrimeSplitButton>
</template>
