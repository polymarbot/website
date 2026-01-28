<script setup lang="ts">
import IconX from '~/components/icon/X.vue'
import IconGitHub from '~/components/icon/GitHub.vue'

defineProps<{
  size?: number
  iconClass?: string
}>()

const appConfig = useAppConfig()

const links = computed(() => [
  {
    label: 'X',
    href: appConfig.links.x,
    icon: IconX,
  },
  {
    label: 'GitHub',
    href: appConfig.links.github,
    icon: IconGitHub,
  },
])
</script>

<template>
  <div class="flex items-center gap-3">
    <WebLink
      v-for="link in links"
      :key="link.href"
      :href="link.href"
      :aria-label="link.label"
      target="_blank"
      unstyled
      class="transition-colors"
      :class="iconClass"
    >
      <component
        :is="link.icon"
        :size="size ?? 20"
      />
    </WebLink>
  </div>
</template>
