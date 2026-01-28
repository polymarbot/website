<script setup lang="ts">
import { z } from 'zod'

export interface TradeStepModalProps {
  visible?: boolean
  step?: TradeStep | null
  steps: TradeStep[]
  intervalMinutes: number
}

const props = withDefaults(defineProps<TradeStepModalProps>(), {
  visible: false,
  step: null,
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'save': [step: TradeStep]
}>()

const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const T = useTranslations('pages.app.strategies._id_.components.TradeStepModal')
const { t } = useI18n()

const isEditing = computed(() => !!props.step)

// Tab options for side selection
const sideOptions = computed(() => [
  { label: T('side.buy'), value: TradeSide.BUY },
  { label: T('side.sell'), value: TradeSide.SELL },
])

// Outcome options with number values
const outcomeOptions = computed(() => [
  { label: T('outcomes.both'), value: undefined },
  { label: T('outcomes.up'), value: 0 },
  { label: T('outcomes.down'), value: 1 },
])

// Default end time for buy steps
const buyDefaultEndTimeMap: Record<number, number> = {
  15: 5,
  60: 30,
  240: 180,
  1440: 1200,
}

// Default end time for sell steps
const sellDefaultEndTimeMap: Record<number, number> = {
  15: 10,
  60: 50,
  240: 220,
  1440: 1400,
}

function getTotalBuySize (steps: TradeStep[]): number {
  return steps
    .filter(s => s.side === TradeSide.BUY)
    .reduce((sum, s) => sum + s.size, 0)
}

function getDefaultBuyFormState (intervalMinutes: number): TradeStepBuy {
  return {
    side: TradeSide.BUY,
    price: 0.1,
    size: 5,
    start: 0,
    end: buyDefaultEndTimeMap[intervalMinutes] ?? Math.floor(intervalMinutes / 2),
    once: false,
    outcomeIndex: undefined,
    maxUnderlyingChange: undefined,
    minUnderlyingChange: undefined,
  }
}

function getDefaultSellFormState (intervalMinutes: number, steps: TradeStep[]): TradeStepSell {
  const totalBuySize = getTotalBuySize(steps)
  return {
    side: TradeSide.SELL,
    price: 0.9,
    size: totalBuySize > 0 ? totalBuySize : 5,
    start: 0,
    end: sellDefaultEndTimeMap[intervalMinutes] ?? Math.floor(intervalMinutes * 0.8),
  }
}

const formState: TradeStep = shallowReactive(getDefaultBuyFormState(props.intervalMinutes))

// Buy mode based on price
const buyMode = computed(() => {
  return formState.price <= 0.5 ? 'lowBuy' : 'chaseUp'
})

// Computed properties to convert between display format (0.1-100%) and internal format (1-1000)
const maxUnderlyingChangeDisplay = computed({
  get: () => formState.maxUnderlyingChange !== undefined ? formState.maxUnderlyingChange / 10 : undefined,
  set: (value: number | undefined) => {
    formState.maxUnderlyingChange = value !== undefined ? Math.round(value * 10) : undefined
  },
})

const minUnderlyingChangeDisplay = computed({
  get: () => formState.minUnderlyingChange !== undefined ? formState.minUnderlyingChange / 10 : undefined,
  set: (value: number | undefined) => {
    formState.minUnderlyingChange = value !== undefined ? Math.round(value * 10) : undefined
  },
})

// Validation schema
const schema = computed(() => {
  const baseSchema = {
    side: z.enum([ TradeSide.BUY, TradeSide.SELL ]),
    price: z.number()
      .min(0.01, t('pages.app.strategies._id_.components.TradeStepModal.validation.priceMin'))
      .max(0.99, t('pages.app.strategies._id_.components.TradeStepModal.validation.priceMax')),
    size: z.number()
      .min(5, t('pages.app.strategies._id_.components.TradeStepModal.validation.sizeMin')),
    start: z.number().min(0).max(props.intervalMinutes),
    end: z.number().min(0).max(props.intervalMinutes),
  }

  if (formState.side === TradeSide.BUY) {
    return z.object({
      ...baseSchema,
      once: z.boolean(),
      outcomeIndex: z.number().int().min(0).max(1).optional(),
      // Internal format: 1-1000 (0.1% - 100%)
      maxUnderlyingChange: z.number().min(0).max(1000).optional(),
      minUnderlyingChange: z.number().min(0).max(1000).optional(),
    }).refine(data => data.start < data.end, {
      message: t('pages.app.strategies._id_.components.TradeStepModal.validation.timeRange'),
      path: [ 'end' ],
    })
  }

  return z.object({
    ...baseSchema,
    once: z.boolean().optional(),
    outcomeIndex: z.number().optional(),
    maxUnderlyingChange: z.number().optional(),
    minUnderlyingChange: z.number().optional(),
  }).refine(data => data.start < data.end, {
    message: t('pages.app.strategies._id_.components.TradeStepModal.validation.timeRange'),
    path: [ 'end' ],
  })
})

// Use form composable
const { origin, validate, validationResult } = useForm<TradeStep>(formState, {
  schema,
})

// Initialize form when modal opens or step changes
watch(visible, isVisible => {
  if (isVisible) {
    if (props.step) {
      origin.value = props.step
    } else {
      const defaults = getDefaultBuyFormState(props.intervalMinutes)
      Object.assign(formState, defaults)
    }
  }
}, { immediate: true })

// Update defaults when side changes (only for new steps)
watch(() => formState.side, newSide => {
  if (isEditing.value) return

  if (newSide === TradeSide.BUY) {
    const defaults = getDefaultBuyFormState(props.intervalMinutes)
    Object.assign(formState, defaults)
  } else {
    const defaults = getDefaultSellFormState(props.intervalMinutes, props.steps)
    Object.assign(formState, defaults)
  }
})

// Handle save
async function handleSave () {
  try {
    const data = await validate()

    let step: TradeStep

    if (data.side === TradeSide.BUY) {
      const {
        side,
        price,
        size,
        start,
        end,
        once,
        outcomeIndex,
        maxUnderlyingChange,
        minUnderlyingChange,
      } = data

      const stepBuy: TradeStepBuy = {
        side,
        price,
        size,
        start,
        end,
      }

      // Add optional fields
      if (once) {
        stepBuy.once = true
      }
      if (outcomeIndex !== undefined) {
        stepBuy.outcomeIndex = outcomeIndex
      }
      // Add change fields based on buy mode (formState already stores internal format: 1-1000)
      // 0 is treated as empty (no limit)
      if (buyMode.value === 'lowBuy' && maxUnderlyingChange) {
        stepBuy.maxUnderlyingChange = maxUnderlyingChange
      }
      if (buyMode.value === 'chaseUp' && minUnderlyingChange) {
        stepBuy.minUnderlyingChange = minUnderlyingChange
      }

      step = stepBuy
    } else {
      const {
        side,
        price,
        size,
        start,
        end,
      } = data

      step = {
        side,
        price,
        size,
        start,
        end,
      } as TradeStepSell
    }

    emit('save', step)
    visible.value = false
  } catch (err) {
    console.error('Validation failed:', err)
  }
}

// Modal title
const modalTitle = computed(() => {
  return isEditing.value ? T('modal.titleEdit') : T('modal.titleCreate')
})

// Estimated USDC amount
const estimatedAmount = computed(() => {
  return formatCurrency(formState.size * formState.price)
})

// Time range help text based on side and buy mode
const timeRangeHelpText = computed(() => {
  if ((formState.side as TradeSideType) === TradeSide.SELL) {
    return T('help.sell.timeRange')
  }

  const baseText = T('help.buy.timeRange')
  const modeText = buyMode.value === 'lowBuy'
    ? T('help.buy.timeRangeLowBuy')
    : T('help.buy.timeRangeChaseUp')

  return `${baseText}\n\n${modeText}`
})
</script>

<template>
  <Modal
    :visible="visible"
    :title="modalTitle"
    showCancel
    showClose
    @cancel="visible = false"
    @confirm="handleSave"
  >
    <div class="flex flex-col gap-4">
      <!-- Side tabs -->
      <div class="flex flex-col gap-1">
        <FormLabel>{{ T('fields.side') }}</FormLabel>
        <SelectButton
          v-if="!isEditing"
          v-model="formState.side"
          :options="sideOptions"
        />
        <Tag
          v-else
          class="self-start"
          :severity="formState.side === TradeSide.BUY ? 'success' : 'danger'"
          :value="formState.side === TradeSide.BUY ? T('side.buy') : T('side.sell')"
        />
      </div>

      <!-- Buy mode indicator -->
      <Message
        v-if="formState.side === TradeSide.BUY"
        :severity="buyMode === 'lowBuy' ? 'info' : 'warn'"
      >
        {{ buyMode === 'lowBuy' ? T('buyMode.lowBuy') : T('buyMode.chaseUp') }}
      </Message>

      <!-- Price -->
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-1">
          <FormLabel>{{ T('fields.price') }}</FormLabel>
          <Help :text="formState.side === TradeSide.BUY ? T('help.buy.price') : T('help.sell.price')" />
        </div>
        <InputNumberSlider
          v-model="formState.price"
          name="price"
          :minFractionDigits="1"
          :maxFractionDigits="2"
          :min="0.01"
          :max="0.99"
          :step="0.01"
          :invalid="!!validationResult.price"
        />
        <small class="text-muted-color">
          {{ T('hints.priceRange') }}
        </small>
        <FormError
          name="price"
          :errors="validationResult"
        />
      </div>

      <!-- Shares -->
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-1">
          <FormLabel>{{ T('fields.size') }}</FormLabel>
          <span class="text-sm text-muted-color">
            ≈ {{ estimatedAmount }}
          </span>
          <Help :text="formState.side === TradeSide.BUY ? T('help.buy.size') : T('help.sell.size')" />
        </div>
        <InputNumber
          v-model="formState.size"
          name="size"
          :min="5"
          :invalid="!!validationResult.size"
        />
        <small class="text-muted-color">
          {{ T('hints.minSize') }}
        </small>
        <FormError
          name="size"
          :errors="validationResult"
        />
      </div>

      <!-- Time Range -->
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-1">
          <FormLabel>{{ T('fields.timeRange') }}</FormLabel>
          <Help :text="timeRangeHelpText" />
        </div>
        <InputRangeSlider
          v-model:start="formState.start"
          v-model:end="formState.end"
          name="timeRange"
          :min="0"
          :max="intervalMinutes"
          :step="1"
          :invalid="!!validationResult.end"
        />
        <small class="text-muted-color">
          {{ T('hints.timeRange', { max: intervalMinutes }) }}
        </small>
        <FormError
          name="end"
          :errors="validationResult"
        />
      </div>

      <!-- Buy-specific fields -->
      <template v-if="formState.side === TradeSide.BUY">
        <!-- Outcome selection -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-1">
            <FormLabel>{{ T('fields.outcome') }}</FormLabel>
            <Help :text="T('help.buy.outcome')" />
          </div>
          <Select
            v-model="formState.outcomeIndex"
            :options="outcomeOptions"
          />
          <small class="text-muted-color">
            {{ T('hints.outcome') }}
          </small>
        </div>

        <!-- Max underlying change (low buy mode only) -->
        <div
          v-if="buyMode === 'lowBuy'"
          class="flex flex-col gap-1"
        >
          <div class="flex items-center gap-1">
            <FormLabel>{{ T('fields.maxChange') }}</FormLabel>
            <Help :text="T('help.buy.maxChange')" />
          </div>
          <InputPercentSlider
            v-model="maxUnderlyingChangeDisplay"
            name="maxUnderlyingChange"
            :minFractionDigits="1"
            :min="0"
            :max="100"
            :step="0.1"
          />
        </div>

        <!-- Min underlying change (chase up mode only) -->
        <div
          v-if="buyMode === 'chaseUp'"
          class="flex flex-col gap-1"
        >
          <div class="flex items-center gap-1">
            <FormLabel>{{ T('fields.minChange') }}</FormLabel>
            <Help :text="T('help.buy.minChange')" />
          </div>
          <InputPercentSlider
            v-model="minUnderlyingChangeDisplay"
            name="minUnderlyingChange"
            :minFractionDigits="1"
            :min="0"
            :max="100"
            :step="0.1"
          />
        </div>

        <!-- Once toggle (at the bottom) -->
        <label class="flex cursor-pointer items-center gap-2">
          <Switch v-model="formState.once" />
          <span>{{ T('fields.once') }}</span>
          <Help :text="T('help.buy.once')" />
        </label>
      </template>
    </div>
  </Modal>
</template>
