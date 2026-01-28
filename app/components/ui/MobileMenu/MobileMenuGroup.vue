<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <div class="overflow-hidden rounded-xl bg-surface">
    <h3
      v-if="title"
      class="px-4 py-3 text-sm font-medium text-muted-color"
    >
      {{ title }}
    </h3>
    <slot />
  </div>
</template>
