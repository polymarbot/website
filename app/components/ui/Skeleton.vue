<script setup lang="ts">
import type { SkeletonProps as BaseSkeletonProps } from 'primevue/skeleton'

export interface SkeletonProps extends /* @vue-ignore */ BaseSkeletonProps {}

defineProps<SkeletonProps>()
</script>

<template>
  <PrimeSkeleton />
</template>
