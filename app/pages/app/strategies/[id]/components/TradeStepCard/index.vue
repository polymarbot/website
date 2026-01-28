<script setup lang="ts">
interface Props {
  step: TradeStep
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
})

const emit = defineEmits<{
  edit: []
  delete: []
}>()

const T = useTranslations('pages.app.strategies._id_.components.TradeStepCard')
const TC = useTranslations('common')
const { formatTimeRange } = useDate()

const isBuyStep = computed(() => props.step.side === TradeSide.BUY)

// Determine buy mode for buy steps
const buyMode = computed(() => {
  if (!isBuyStep.value) return null
  return props.step.price <= 0.5 ? 'lowBuy' : 'chaseUp'
})

// Format outcome index
function formatOutcome (outcomeIndex: 0 | 1 | undefined): string | null {
  if (outcomeIndex === undefined) return null
  return outcomeIndex === 0 ? 'Up' : 'Down'
}
</script>

<template>
  <Card
    class="relative w-full min-w-[14rem] bg-surface-alt"
    :pt="{
      body: 'p-3',
    }"
  >
    <!-- Header with side badge and actions -->
    <template #header>
      <div
        class="
          flex items-center justify-between border-b border-surface px-3 py-2
        "
      >
        <Tag
          :severity="isBuyStep ? 'success' : 'danger'"
          :value="isBuyStep ? T('side.buy') : T('side.sell')"
        />
        <div
          v-if="!readonly"
          class="flex gap-1"
        >
          <Button
            icon="pi pi-pencil"
            severity="secondary"
            text
            rounded
            size="small"
            :aria-label="T('actions.edit')"
            @click="emit('edit')"
          />
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            size="small"
            :aria-label="T('actions.delete')"
            @click="emit('delete')"
          />
        </div>
      </div>
    </template>

    <!-- Step details -->
    <template #content>
      <div class="flex flex-col gap-2 text-sm leading-6">
        <!-- Price -->
        <div class="flex items-center justify-between">
          <span class="text-muted-color">
            {{ T('fields.price') }}
          </span>
          <span class="font-medium">
            {{ formatCurrency(step.price) }}
          </span>
        </div>

        <!-- Shares -->
        <div class="flex items-center justify-between">
          <span class="text-muted-color">
            {{ T('fields.size') }}
          </span>
          <span class="font-medium">
            {{ step.size }} <span class="text-muted-color">
              ≈ {{ formatCurrency(step.size * step.price) }}
            </span>
          </span>
        </div>

        <!-- Time range -->
        <div class="flex items-center justify-between">
          <span class="text-muted-color">
            {{ T('fields.timeRange') }}
          </span>
          <span class="font-medium">
            {{ formatTimeRange(step.start, step.end) }}
          </span>
        </div>

        <!-- Buy-specific fields -->
        <template v-if="isBuyStep">
          <!-- Outcome -->
          <div
            v-if="formatOutcome((step as TradeStepBuy).outcomeIndex) !== null"
            class="flex items-center justify-between"
          >
            <span class="text-muted-color">
              {{ T('fields.outcome') }}
            </span>
            <span class="font-medium">
              {{ formatOutcome((step as TradeStepBuy).outcomeIndex) }}
            </span>
          </div>

          <!-- Max underlying change (low buy mode) -->
          <div
            v-if="buyMode === 'lowBuy' && (step as TradeStepBuy).maxUnderlyingChange"
            class="flex items-center justify-between"
          >
            <span class="text-muted-color">
              {{ T('fields.maxChange') }}
            </span>
            <span class="font-medium">
              {{ ((step as TradeStepBuy).maxUnderlyingChange! / 10).toFixed(1) }}%
            </span>
          </div>

          <!-- Min underlying change (chase up mode) -->
          <div
            v-if="buyMode === 'chaseUp' && (step as TradeStepBuy).minUnderlyingChange"
            class="flex items-center justify-between"
          >
            <span class="text-muted-color">
              {{ T('fields.minChange') }}
            </span>
            <span class="font-medium">
              {{ ((step as TradeStepBuy).minUnderlyingChange! / 10).toFixed(1) }}%
            </span>
          </div>

          <!-- Once (at the bottom) -->
          <div
            v-if="(step as TradeStepBuy).once"
            class="flex items-center justify-between"
          >
            <span class="text-muted-color">
              {{ T('fields.once') }}
            </span>
            <Tag
              severity="info"
              :value="TC('labels.yes')"
            />
          </div>
        </template>
      </div>
    </template>
  </Card>
</template>
