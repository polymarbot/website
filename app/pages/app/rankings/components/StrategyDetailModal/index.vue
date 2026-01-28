<script setup lang="ts">
import StrategyStatsModal from '~/pages/app/strategies/[id]/components/StrategyStatsModal/index.vue'

interface Props {
  visible: boolean
  strategy: StrategyRanking | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const localVisible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const T = useTranslations('pages.app.rankings.components.StrategyDetailModal')
const request = useRequest()

// Check if user has created this strategy
const existingStrategyId = ref<string | null>(null)
const existingStrategyName = ref<string | null>(null)
const isCheckingStrategy = ref(false)

// Computed confirm button text
const confirmText = computed(() => {
  return existingStrategyId.value ? T('actions.editStrategy') : T('actions.createStrategy')
})

// Check if strategy exists
async function checkStrategyExists () {
  if (!props.strategy) {
    existingStrategyId.value = null
    existingStrategyName.value = null
    return
  }

  try {
    isCheckingStrategy.value = true

    const result = await request.post<{ id: string, name: string } | null>('/api/strategies/check', {
      strategyJson: props.strategy.strategyJson,
      interval: props.strategy.interval,
    })

    existingStrategyId.value = result?.id || null
    existingStrategyName.value = result?.name || null
  } catch (error) {
    console.error('Failed to check strategy existence:', error)
    existingStrategyId.value = null
    existingStrategyName.value = null
  } finally {
    isCheckingStrategy.value = false
  }
}

// Navigate to create or edit strategy
function handleConfirm () {
  if (!props.strategy) return

  if (existingStrategyId.value) {
    navigateTo(`/app/strategies/${existingStrategyId.value}`)
  } else {
    navigateTo(`/app/strategies/new?marketStrategyId=${props.strategy.strategyId}`)
  }
}

// Check strategy when modal becomes visible
watch(() => props.visible, visible => {
  if (visible && props.strategy) {
    checkStrategyExists()
  }
}, { immediate: true })
</script>

<template>
  <StrategyStatsModal
    v-if="strategy"
    v-model:visible="localVisible"
    :interval="strategy.interval as MarketIntervalType"
    :strategyJson="strategy.strategyJson"
    :hideFooter="false"
    :confirmText="confirmText"
    :loading="isCheckingStrategy"
    :confirmDisabled="isCheckingStrategy"
    @confirm="handleConfirm"
  >
    <template
      v-if="existingStrategyName"
      #footerLeft
    >
      <div class="flex min-w-0 items-center gap-2">
        <span class="shrink-0 text-muted-color">
          {{ T('myStrategy') }}:
        </span>
        <span class="truncate font-medium">
          {{ existingStrategyName }}
        </span>
      </div>
    </template>
  </StrategyStatsModal>
</template>
