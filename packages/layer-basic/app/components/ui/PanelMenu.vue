<script setup lang="ts">
import type { PanelMenuProps as BasePanelMenuProps } from 'primevue/panelmenu'

export interface PanelMenuProps extends /* @vue-ignore */ BasePanelMenuProps {}

defineProps<PanelMenuProps>()
</script>

<template>
  <PrimePanelMenu>
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
  </PrimePanelMenu>
</template>
