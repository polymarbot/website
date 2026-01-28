<script setup lang="ts">
import type { BreadcrumbProps as BaseBreadcrumbProps } from 'primevue/breadcrumb'

export interface BreadcrumbProps extends /* @vue-ignore */ BaseBreadcrumbProps {}

defineProps<BreadcrumbProps>()
</script>

<template>
  <PrimeBreadcrumb>
    <!-- Default item template with href support via WebLink -->
    <template
      v-if="!$slots.item"
      #item="{ item, props: itemProps }"
    >
      <WebLink
        v-if="item.href"
        :href="item.href"
        unstyled
        v-bind="itemProps.action"
      >
        <span
          v-if="item.icon"
          :class="[ item.icon, 'text-color' ]"
        />
        <span>{{ item.label }}</span>
      </WebLink>
      <a
        v-else
        :href="item.url"
        :target="item.target"
        v-bind="itemProps.action"
      >
        <span
          v-if="item.icon"
          :class="[ item.icon, 'text-color' ]"
        />
        <span>{{ item.label }}</span>
      </a>
    </template>

    <!-- Pass through all other slots -->
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
  </PrimeBreadcrumb>
</template>
