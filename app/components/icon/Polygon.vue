<script setup lang="ts">
withDefaults(defineProps<{
  size?: number
}>(), {
  size: 24,
})
</script>

<template>
  <img
    :width="size"
    :height="size"
    src="/img/chain/polygon.svg"
    alt="Polygon"
  >
</template>
