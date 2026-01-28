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
    src="/img/symbol/usdc.png"
    alt="USDC"
    style="max-width: none;"
  >
</template>
