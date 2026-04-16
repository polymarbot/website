<script setup lang="ts">
import type { AvatarProps as BaseAvatarProps } from 'primevue/avatar'

export interface AvatarProps extends /* @vue-ignore */ BaseAvatarProps {
  image?: string
  label?: string
  // Non-passthrough prop: only used internally
  fallbackLabel?: string
}

const props = withDefaults(defineProps<AvatarProps>(), {
  image: undefined,
  label: undefined,
  fallbackLabel: undefined,
})

const imageLoadFailed = ref(false)

const effectiveImage = computed(() => {
  if (imageLoadFailed.value || !props.image) {
    return undefined
  }
  return props.image
})

const effectiveLabel = computed(() => {
  if (effectiveImage.value) {
    return undefined
  }
  return props.fallbackLabel ?? props.label
})

// Reset failed state when image prop changes
watch(() => props.image, () => {
  imageLoadFailed.value = false
})

const handleImageError = () => {
  imageLoadFailed.value = true
}
</script>

<template>
  <PrimeAvatar
    :image="effectiveImage"
    :label="effectiveLabel"
    @error="handleImageError"
  >
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
  </PrimeAvatar>
</template>
