<script setup lang="ts">
const props = defineProps<{
  label: string
  icon: string
  used: number
  limit: number
}>()

const percentage = computed(() => {
  if (props.limit === 0) return 0
  return Math.min(100, Math.round((props.used / props.limit) * 100))
})

const progressColor = computed(() => {
  if (percentage.value >= 90) return 'bg-danger'
  if (percentage.value >= 70) return 'bg-warn'
  return 'bg-primary'
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <i
          :class="icon"
          class="text-muted-color"
        />
        <span class="text-sm text-color">
          {{ label }}
        </span>
      </div>
      <span class="text-sm text-muted-color">
        {{ used }} / {{ limit }}
      </span>
    </div>
    <div class="h-2 w-full overflow-hidden rounded-full bg-emphasis">
      <div
        class="h-full rounded-full transition-all duration-300"
        :class="progressColor"
        :style="{ width: `${percentage}%` }"
      />
    </div>
  </div>
</template>
