<script setup lang="ts">
import { isVNode } from 'vue'
import type { VNode } from 'vue'

defineProps<{
  icon?: string
  content?: string | VNode | HTMLElement
}>()

// Check if content is HTMLElement
function isHTMLElement (value: unknown): value is HTMLElement {
  return value instanceof HTMLElement
}
</script>

<template>
  <div class="flex w-full items-center gap-4">
    <!-- Icon -->
    <i
      v-if="icon"
      :class="icon"
      class="text-3xl"
    />
    <!-- Content -->
    <div class="flex-1">
      <!-- VNode: render directly -->
      <component
        :is="content"
        v-if="isVNode(content)"
      />
      <!-- HTMLElement: mount via ref -->
      <div
        v-else-if="isHTMLElement(content)"
        ref="elementContainer"
      >
        <component :is="() => content" />
      </div>
      <!-- String: render as text with whitespace preserved -->
      <span
        v-else-if="content"
        class="whitespace-pre-wrap"
      >
        {{ content }}
      </span>
    </div>
  </div>
</template>
