<script setup lang="ts">
const props = defineProps<{
  visible: boolean
  funder?: string | null
  strategyId?: string | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'success': []
}>()

const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const T = useTranslations('pages.bots.components.CreateModal')
const request = useRequest()
const toast = useToast()
const dialog = useDialog()

const loading = ref(false)

// Form state
const formState: {
  interval: MarketIntervalType | undefined
  symbols: MarketSymbolType[]
  strategyId?: string
  funder?: string
} = reactive({
  interval: undefined,
  symbols: [],
  strategyId: undefined,
  funder: undefined,
})

// Use form composable
const { validate, validateField, resetToDefault, validationResult } = useForm(formState, {
  schema: createApiValidationSchema('POST', '/api/bots/batch-create'),
  autoValidate: false,
})

// Whether fields are locked by external props
const isFunderLocked = computed(() => !!props.funder)
const isStrategyLocked = computed(() => !!props.strategyId)

// Apply locked values when modal opens, reset when it closes
watch(visible, async value => {
  if (value) {
    if (props.funder) formState.funder = props.funder
    if (props.strategyId) {
      formState.strategyId = props.strategyId
      // Fetch strategy to get its interval
      try {
        const strategy = await request.get<StrategyItem>(`/api/strategies/${props.strategyId}`)
        formState.interval = strategy.interval
      } catch (err) {
        console.error('Failed to fetch strategy:', err)
      }
    }
  } else {
    resetToDefault()
  }
})

// Handle confirm button click
async function handleConfirm () {
  loading.value = true

  try {
    const data = await validate()

    // Build payload, only include symbols if any are selected
    const payload: {
      interval: MarketIntervalType
      symbols?: MarketSymbolType[]
      strategyId: string
      funder: string
    } = {
      interval: data.interval as MarketIntervalType,
      strategyId: data.strategyId!,
      funder: data.funder!,
    }

    if (data.symbols.length > 0) {
      payload.symbols = data.symbols
    }

    const result = await request.post<{
      created: number
      skipped: number
    }>('/api/bots/batch-create', payload)

    visible.value = false
    emit('success')

    // Show result
    if (result.created === 0 && result.skipped === 0) {
      // No bots to create
      toast.info(T('messages.noBotsToCreate'))
    } else if (result.skipped > 0) {
      // Has skipped bots - build message dynamically
      const parts: string[] = []
      if (result.created > 0) {
        parts.push(T('messages.resultCreated', { count: result.created }))
      }
      if (result.skipped > 0) {
        parts.push(T('messages.resultSkipped', { count: result.skipped }))
      }
      await dialog.alert({
        type: 'info',
        header: T('modals.result.title'),
        message: parts.join('\n'),
      })
    } else {
      // All succeeded
      toast.success(T('messages.createSuccess', { count: result.created }))
    }
  } catch (err) {
    // Ignore validation errors (already handled by useForm)
    if ((err as { fields?: unknown }).fields) return
    console.error('Failed to create bots:', err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Modal
    :visible="visible"
    :title="T('title')"
    :loading="loading"
    showCancel
    @cancel="visible = false"
    @confirm="handleConfirm"
  >
    <div class="flex flex-col gap-4">
      <!-- Interval selection (must be first) -->
      <div class="flex flex-col gap-1">
        <FormLabel required>
          {{ T('fields.interval') }}
        </FormLabel>
        <AppMarketIntervalSelect
          v-model="formState.interval"
          :invalid="!!validationResult.interval"
          :disabled="isStrategyLocked"
          showMinutes
          @change="validateField('interval')"
        />
        <span
          v-if="!isStrategyLocked"
          class="text-xs text-muted-color"
        >
          {{ T('hints.intervalFirst') }}
        </span>
        <FormError
          name="interval"
          :errors="validationResult"
        />
      </div>

      <!-- Symbol selection (optional, multiple) -->
      <div class="flex flex-col gap-1">
        <FormLabel>
          {{ T('fields.symbols') }}
        </FormLabel>
        <AppMarketSymbolSelect
          v-model="formState.symbols"
          :placeholder="T('placeholders.allSymbols')"
          multiple
          showClear
        />
        <span class="text-xs text-muted-color">
          {{ T('hints.symbolsOptional') }}
        </span>
      </div>

      <!-- Strategy selection (filtered by interval) -->
      <div class="flex flex-col gap-1">
        <FormLabel required>
          {{ T('fields.strategy') }}
        </FormLabel>
        <AppStrategySelect
          v-model="formState.strategyId"
          name="strategyId"
          :interval="isStrategyLocked ? undefined : (formState.interval || undefined)"
          :placeholder="T('placeholders.selectStrategy')"
          :disabled="isStrategyLocked || !formState.interval"
          :invalid="!!validationResult.strategyId"
          @change="validateField('strategyId')"
        />
        <span
          v-if="!isStrategyLocked"
          class="text-xs text-muted-color"
        >
          {{ T('hints.strategyFiltered') }}
        </span>
        <FormError
          name="strategyId"
          :errors="validationResult"
        />
      </div>

      <!-- Wallet selection -->
      <div class="flex flex-col gap-1">
        <FormLabel required>
          {{ T('fields.wallet') }}
        </FormLabel>
        <AppWalletSelect
          v-model="formState.funder"
          name="funder"
          :placeholder="T('placeholders.selectWallet')"
          :disabled="isFunderLocked"
          :invalid="!!validationResult.funder"
          @change="validateField('funder')"
        />
        <FormError
          name="funder"
          :errors="validationResult"
        />
      </div>

      <!-- Info message -->
      <Message severity="info">
        {{ T('hints.batchCreate') }}
      </Message>
    </div>
  </Modal>
</template>
