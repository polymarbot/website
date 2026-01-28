<script setup lang="ts">
import StrategyStatsModal from '~/pages/app/strategies/[id]/components/StrategyStatsModal/index.vue'

/**
 * StrategyDisplay Component
 *
 * Displays strategy information with optional link to the strategy detail page.
 *
 * Features:
 * - Displays strategy name as text or clickable link (when strategyId is provided)
 * - Optional amount display with currency formatting
 * - Automatic link generation to strategy detail page (when strategyId is provided)
 * - Tooltip on hover for clickable links
 * - Optional stats button to open statistics modal
 * - Scalable with em units - adjust size via font-size
 */

export interface StrategyDisplayProps {
  /** The strategy name */
  name: string
  /** Optional amount to display after the strategy name */
  amount?: number | string
  /** The strategy ID (optional, enables clickable link when provided) */
  strategyId?: string
  /** Whether to show the stats button */
  showStats?: boolean
  /** Strategy JSON (required when showStats is true) */
  strategyJson?: string
  /** Market interval (required when showStats is true) */
  interval?: MarketIntervalType
  /** Market symbols for filtering stats, comma-separated (optional, e.g., "btc,eth") */
  symbols?: string
}

const props = withDefaults(defineProps<StrategyDisplayProps>(), {
  strategyId: undefined,
  amount: undefined,
  showStats: false,
  strategyJson: undefined,
  interval: undefined,
  symbols: undefined,
})

const T = useTranslations('components.app.StrategyDisplay')

// Generate strategy detail page URL
const strategyUrl = computed(() => props.strategyId ? `/app/strategies/${props.strategyId}` : undefined)

// Stats modal state
const showStatsModal = ref(false)
</script>

<template>
  <div class="inline-flex items-center gap-2 text-[1em]">
    <!-- Stats button -->
    <Tooltip
      v-if="showStats && strategyJson && interval"
      :text="T('viewStats')"
    >
      <Button
        icon="pi pi-chart-bar"
        text
        class="h-[2em] w-[2em] text-[0.875em]"
        @click.stop="showStatsModal = true"
      />
    </Tooltip>

    <!-- Strategy name (clickable link when strategyId is provided) -->
    <Tooltip
      v-if="strategyUrl"
      :text="T('viewDetails')"
    >
      <WebLink
        :href="strategyUrl"
        unstyled
        class="hover:underline"
      >
        {{ name }}
      </WebLink>
    </Tooltip>

    <!-- Strategy name (plain text when strategyId is not provided) -->
    <span v-else>
      {{ name }}
    </span>

    <!-- Amount (optional) -->
    <span
      v-if="amount !== undefined"
      class="text-muted-color"
    >
      ({{ formatCurrency(amount) }})
    </span>

    <!-- Stats Modal -->
    <StrategyStatsModal
      v-if="showStats && strategyJson && interval"
      v-model:visible="showStatsModal"
      :strategyJson="strategyJson"
      :interval="interval"
      :defaultSymbol="symbols"
    />
  </div>
</template>
