<script setup lang="ts">
import { getIntervalLabelWithMinutes } from '~/components/app/MarketIntervalSelect/utils'

defineProps<{
  item: StrategyRanking
  index: number
  highlightValue: string
  highlightColor: string
}>()

defineEmits<{
  click: []
}>()

// Get medal emoji for top 3 rankings
function getRankingDisplay (index: number): string {
  const medals = [ '🥇', '🥈', '🥉' ]
  return index < 3 ? (medals[index] ?? '') : String(index + 1)
}
</script>

<template>
  <div
    class="
      flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors
      hover:bg-emphasis
    "
    @click="$emit('click')"
  >
    <!-- Ranking Badge -->
    <div
      class="
        flex h-8 w-8 shrink-0 items-center justify-center rounded-full
        bg-surface-200
        dark:bg-surface-700
      "
    >
      <span
        v-if="index < 3"
        class="text-2xl"
      >
        {{ getRankingDisplay(index) }}
      </span>
      <span
        v-else
        class="font-bold"
      >
        {{ getRankingDisplay(index) }}
      </span>
    </div>

    <!-- Strategy Info -->
    <div class="min-w-0 flex-1 space-y-1">
      <!-- Stats -->
      <div class="text-sm font-semibold">
        <slot name="stats" />
      </div>

      <!-- Interval -->
      <div class="text-xs text-muted-color">
        {{ getIntervalLabelWithMinutes(item.interval as MarketIntervalType) }}
      </div>
    </div>

    <!-- Highlight Value -->
    <div class="shrink-0 text-right">
      <div
        class="text-lg font-bold"
        :class="highlightColor"
      >
        {{ highlightValue }}
      </div>
    </div>
  </div>
</template>
