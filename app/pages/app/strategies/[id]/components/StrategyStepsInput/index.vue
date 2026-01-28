<script setup lang="ts">
import TradeStepCard from '../TradeStepCard/index.vue'
import TradeStepModal from '../TradeStepModal/index.vue'

export interface StrategyStepsInputProps {
  modelValue?: string
  intervalMinutes: number
  maxSteps?: number
}

const props = withDefaults(defineProps<StrategyStepsInputProps>(), {
  modelValue: '[]',
  maxSteps: 10,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// v-model for the JSON string
const model = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const T = useTranslations('pages.app.strategies._id_.components.StrategyStepsInput')

// Parse steps from JSON string
const steps = computed<TradeStep[]>(() => safeJsonParse(model.value, []))

// Calculate total amount for buy steps
const totalAmount = computed(() => {
  return calculateStrategyMaxAmount(steps.value)
})

// Count buy and sell steps
const buyCount = computed(() => steps.value.filter(s => s.side === TradeSide.BUY).length)
const sellCount = computed(() => steps.value.filter(s => s.side === TradeSide.SELL).length)

// Modal state
const showModal = ref(false)
const editingIndex = ref<number | null>(null)
const editingStep = computed(() => {
  if (editingIndex.value === null) return null
  return steps.value[editingIndex.value] ?? null
})

// Can add more steps
const canAddStep = computed(() => steps.value.length < props.maxSteps)

// Update the JSON string model
function updateModel (newSteps: TradeStep[]) {
  model.value = stringifyTradeSteps(newSteps)
}

// Adjust steps when intervalMinutes changes
watch(() => props.intervalMinutes, newInterval => {
  if (steps.value.length === 0) return

  let hasChanges = false
  const adjustedSteps = steps.value.map(step => {
    // Clamp start and end to valid range
    let newStart = Math.min(step.start, newInterval)
    let newEnd = Math.min(step.end, newInterval)

    // Ensure start < end (at least 1 minute gap)
    if (newStart >= newEnd) {
      newEnd = Math.min(newStart + 1, newInterval)
      if (newStart >= newEnd) {
        newStart = Math.max(newEnd - 1, 0)
      }
    }

    if (newStart !== step.start || newEnd !== step.end) {
      hasChanges = true
      return { ...step, start: newStart, end: newEnd }
    }
    return step
  })

  if (hasChanges) {
    updateModel(adjustedSteps)
  }
})

// Open modal to add new step
function handleAddStep () {
  if (!canAddStep.value) return
  editingIndex.value = null
  showModal.value = true
}

// Open modal to edit existing step
function handleEditStep (index: number) {
  editingIndex.value = index
  showModal.value = true
}

// Delete a step
function handleDeleteStep (index: number) {
  const newSteps = [ ...steps.value ]
  newSteps.splice(index, 1)
  updateModel(newSteps)
}

// Save step from modal
function handleSaveStep (step: TradeStep) {
  const newSteps = [ ...steps.value ]

  if (editingIndex.value !== null) {
    // Update existing step
    newSteps[editingIndex.value] = step
  } else {
    // Add new step
    newSteps.push(step)
  }

  updateModel(newSteps)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header with add button and stats -->
    <div class="flex flex-wrap items-center gap-4">
      <!-- Add button -->
      <Button
        icon="pi pi-plus"
        size="small"
        :disabled="!canAddStep"
        @click="handleAddStep"
      >
        {{ T('actions.addStep') }}
      </Button>

      <!-- Step count -->
      <span class="text-sm text-muted-color">
        {{ T('stats.stepCount', { count: steps.length, max: maxSteps }) }}
      </span>

      <!-- Buy/Sell count -->
      <div class="flex gap-2 text-sm">
        <Tag
          severity="success"
          size="small"
        >
          {{ T('stats.buyCount', { count: buyCount }) }}
        </Tag>
        <Tag
          severity="danger"
          size="small"
        >
          {{ T('stats.sellCount', { count: sellCount }) }}
        </Tag>
      </div>

      <!-- Total amount -->
      <div class="text-sm">
        <span class="text-muted-color">
          {{ T('stats.totalAmount') }} ≈
        </span>
        <span class="ml-1 font-semibold">
          {{ formatCurrency(totalAmount) }}
        </span>
      </div>
    </div>

    <!-- Empty state -->
    <Message
      v-if="steps.length === 0"
      severity="secondary"
    >
      {{ T('emptyState') }}
    </Message>

    <!-- Step cards grid -->
    <div
      v-else
      class="flex flex-wrap gap-3"
    >
      <TradeStepCard
        v-for="(step, index) in steps"
        :key="index"
        :step="step"
        class="sm:w-[20rem]"
        @edit="handleEditStep(index)"
        @delete="handleDeleteStep(index)"
      />
    </div>

    <!-- Add/Edit Modal -->
    <TradeStepModal
      v-model:visible="showModal"
      :step="editingStep"
      :steps="steps"
      :intervalMinutes="intervalMinutes"
      @save="handleSaveStep"
    />
  </div>
</template>
