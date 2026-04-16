<script setup lang="ts">
import type { MenuItem } from '@packages/layer-basic/app/components/ui/Dropdown/index.vue'
import { useBatchBotOperations } from '../../composables/useBatchBotOperations'

/** Batch operation types */
type OperationType = 'enable' | 'disable' | 'delete'

const props = defineProps<{
  funder?: string | null
  strategyId?: string | null
}>()

const emit = defineEmits<{
  success: []
}>()

const T = useTranslations('pages.bots.components.BatchBotOperations')
const { isMobile } = useDevice()

// Use batch operations composable
const { execute, isEnabling, isDisabling, isDeleting } = useBatchBotOperations()

// Modal visibility state
const showConditionsModal = ref(false)

// Selected operation type
const currentOperation = ref<OperationType>('enable')

// Form state for conditions
const formState: {
  funder?: string
  strategyId?: string
  intervals: MarketIntervalType[]
  symbols: MarketSymbolType[]
} = reactive({
  funder: undefined,
  strategyId: undefined,
  intervals: [],
  symbols: [],
})

// Whether fields are locked by external props
const isFunderLocked = computed(() => !!props.funder)
const isStrategyLocked = computed(() => !!props.strategyId)

// Apply locked values when modal opens, reset when it closes
watch(showConditionsModal, value => {
  if (value) {
    if (props.funder) formState.funder = props.funder
    if (props.strategyId) formState.strategyId = props.strategyId
  } else {
    formState.funder = undefined
    formState.strategyId = undefined
    formState.intervals = []
    formState.symbols = []
  }
})

// Mutual exclusion: strategy and intervals
// When strategy is selected, clear and disable intervals
// When intervals are selected, clear and disable strategy
const isIntervalsDisabled = computed(() => !!formState.strategyId)
const isStrategyDisabled = computed(() => formState.intervals.length > 0)

// Clear intervals when strategy is selected
watch(() => formState.strategyId, value => {
  if (value && formState.intervals.length > 0) {
    formState.intervals = []
  }
})

// Clear strategy when intervals are selected
watch(() => formState.intervals, value => {
  if (value.length > 0 && formState.strategyId && !isStrategyLocked.value) {
    formState.strategyId = undefined
  }
})

// Check if any filter is selected
const hasFilters = computed(() =>
  formState.funder
  || formState.strategyId
  || formState.intervals.length > 0
  || formState.symbols.length > 0,
)

// Dynamic modal title based on operation type
const modalTitle = computed(() => {
  switch (currentOperation.value) {
    case 'enable':
      return T('modals.byConditions.titleEnable')
    case 'disable':
      return T('modals.byConditions.titleDisable')
    case 'delete':
      return T('modals.byConditions.titleDelete')
    default:
      return ''
  }
})

// Handle batch all (with locked filters only)
async function handleBatchAll (operation: OperationType) {
  await execute(operation, {
    ...(props.funder && { funder: props.funder }),
    ...(props.strategyId && { strategyId: props.strategyId }),
  }, () => emit('success'))
}

// Open modal for conditions-based batch operation
function openConditionsModal (operation: OperationType) {
  currentOperation.value = operation
  showConditionsModal.value = true
}

// Handle conditions modal submit
async function handleConditionsSubmit () {
  showConditionsModal.value = false

  await execute(currentOperation.value, {
    ...(formState.funder && { funder: formState.funder }),
    ...(formState.strategyId && { strategyId: formState.strategyId }),
    ...(formState.intervals.length > 0 && { intervals: formState.intervals }),
    ...(formState.symbols.length > 0 && { symbols: formState.symbols }),
  }, () => emit('success'))
}

// Generate menu items for batch operations
function createMenuItems (operation: OperationType): MenuItem[] {
  return [
    {
      label: T('menu.byConditions'),
      icon: 'pi pi-filter',
      command: () => openConditionsModal(operation),
    },
  ]
}

const enableMenuItems = computed(() => createMenuItems('enable'))
const disableMenuItems = computed(() => createMenuItems('disable'))
const deleteMenuItems = computed(() => createMenuItems('delete'))
</script>

<template>
  <div>
    <!-- Batch Operation Buttons -->
    <div class="flex shrink-0 gap-2">
      <!-- Delete All Button -->
      <SplitButton
        severity="danger"
        outlined
        icon="pi pi-trash"
        :label="isMobile ? undefined : T('actions.deleteAll')"
        :loading="isDeleting"
        :disabled="isEnabling || isDisabling"
        :size="isMobile ? 'small' : undefined"
        :model="deleteMenuItems"
        @click="handleBatchAll('delete')"
      />

      <!-- Disable All Button -->
      <SplitButton
        severity="warn"
        outlined
        icon="pi pi-stop-circle"
        :label="isMobile ? undefined : T('actions.disableAll')"
        :loading="isDisabling"
        :disabled="isEnabling || isDeleting"
        :size="isMobile ? 'small' : undefined"
        :model="disableMenuItems"
        @click="handleBatchAll('disable')"
      />

      <!-- Enable All Button -->
      <SplitButton
        severity="success"
        outlined
        icon="pi pi-play-circle"
        :label="isMobile ? undefined : T('actions.enableAll')"
        :loading="isEnabling"
        :disabled="isDisabling || isDeleting"
        :size="isMobile ? 'small' : undefined"
        :model="enableMenuItems"
        @click="handleBatchAll('enable')"
      />
    </div>

    <!-- By Conditions Modal -->
    <Modal
      :visible="showConditionsModal"
      :title="modalTitle"
      showCancel
      :confirmDisabled="!hasFilters"
      @confirm="handleConditionsSubmit"
      @cancel="showConditionsModal = false"
    >
      <div class="flex flex-col gap-4">
        <!-- Wallet Selection -->
        <div class="flex flex-col gap-1">
          <FormLabel>
            {{ T('modals.byConditions.walletLabel') }}
          </FormLabel>
          <AppWalletSelect
            v-model="formState.funder"
            name="funder"
            :placeholder="T('modals.byConditions.selectWallet')"
            :disabled="isFunderLocked"
            showClear
          />
        </div>

        <!-- Strategy Selection -->
        <div class="flex flex-col gap-1">
          <FormLabel>
            {{ T('modals.byConditions.strategyLabel') }}
          </FormLabel>
          <AppStrategySelect
            v-model="formState.strategyId"
            name="strategyId"
            :placeholder="T('modals.byConditions.selectStrategy')"
            :disabled="isStrategyLocked || isStrategyDisabled"
            showClear
          />
          <small
            v-if="isStrategyDisabled"
            class="text-muted-color"
          >
            {{ T('modals.byConditions.strategyDisabledHint') }}
          </small>
        </div>

        <!-- Interval Selection (Multiple) -->
        <div class="flex flex-col gap-1">
          <FormLabel>
            {{ T('modals.byConditions.intervalLabel') }}
          </FormLabel>
          <AppMarketIntervalSelect
            v-model="formState.intervals"
            multiple
            :placeholder="T('modals.byConditions.selectInterval')"
            :disabled="isIntervalsDisabled"
            showClear
          />
          <small
            v-if="isIntervalsDisabled"
            class="text-muted-color"
          >
            {{ T('modals.byConditions.intervalDisabledHint') }}
          </small>
        </div>

        <!-- Symbol Selection (Multiple) -->
        <div class="flex flex-col gap-1">
          <FormLabel>
            {{ T('modals.byConditions.symbolLabel') }}
          </FormLabel>
          <AppMarketSymbolSelect
            v-model="formState.symbols"
            multiple
            :placeholder="T('modals.byConditions.selectSymbol')"
            showClear
          />
        </div>

        <!-- Hint message -->
        <Message severity="info">
          {{ T('modals.byConditions.hint') }}
        </Message>
      </div>
    </Modal>
  </div>
</template>
