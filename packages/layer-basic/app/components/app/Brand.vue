<script setup lang="ts">
withDefaults(
  defineProps<{
    iconOnly?: boolean
    iconSize?: number
    nameClass?: string
  }>(),
  {
    iconSize: 28,
    nameClass: 'text-xl',
  },
)

const runtimeConfig = useRuntimeConfig()
</script>

<template>
  <div class="flex items-center gap-2">
    <IconLogo
      :size="iconSize"
      class="shrink-0 text-primary"
    />
    <span
      v-if="!iconOnly"
      class="font-semibold"
      :class="nameClass"
    >
      {{ runtimeConfig.public.appName }}
    </span>
  </div>
</template>
