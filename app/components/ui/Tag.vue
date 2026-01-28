<script setup lang="ts">
import type { TagProps as BaseTagProps } from 'primevue/tag'

export interface TagProps extends /* @vue-ignore */ BaseTagProps {}

defineProps<TagProps>()
</script>

<template>
  <PrimeTag>
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
  </PrimeTag>
</template>
