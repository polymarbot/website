<script setup lang="ts">
withDefaults(defineProps<{
  size?: number
}>(), {
  size: 24,
})
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 256 256"
    role="img"
  >
    <path
      d="M128 16
       L224.99 72
       L224.99 184
       L128 240
       L31.01 184
       L31.01 72
       Z"
      fill="none"
      stroke="currentColor"
      stroke-width="27"
      stroke-linejoin="round"
    />
    <rect
      x="82.17"
      y="92"
      width="27"
      height="72"
      rx="13.5"
      fill="currentColor"
    />
    <rect
      x="146.83"
      y="92"
      width="27"
      height="72"
      rx="13.5"
      fill="currentColor"
    />
  </svg>
</template>
