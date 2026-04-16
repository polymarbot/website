<script setup lang="ts">
defineProps<{
  hideTitle?: boolean
}>()
</script>

<template>
  <div
    class="markdown-body"
    :class="{ 'hide-title': hideTitle }"
  >
    <slot />
  </div>
</template>

<style lang="scss">
@import '@packages/layer-basic/app/assets/styles/markdown-themes/github.css';

.markdown-body.hide-title {
  > :first-child > h1:first-child {
    display: none;
  }
}
</style>
