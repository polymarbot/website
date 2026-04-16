<script setup lang="ts">
import type { PopoverProps as BasePopoverProps } from 'primevue/popover'

export interface PopoverProps extends /* @vue-ignore */ BasePopoverProps {}

defineProps<PopoverProps>()
</script>

<template>
  <PrimePopover>
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
  </PrimePopover>
</template>
