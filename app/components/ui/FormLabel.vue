<script setup lang="ts">
/**
 * FormLabel - Unified form label component with optional required indicator
 *
 * Features:
 * - Consistent label styling across the application
 * - Optional required indicator (red asterisk) using absolute positioning
 */

defineProps<{
  /** The for attribute to associate with input */
  htmlFor?: string
  /** Whether the field is required (shows red asterisk) */
  required?: boolean
}>()
</script>

<template>
  <label
    :for="htmlFor"
    class="inline-block text-sm font-medium text-color"
  >
    <slot />
    <span
      v-if="required"
      class="text-danger"
      aria-hidden="true"
    >
      *
    </span>
  </label>
</template>
