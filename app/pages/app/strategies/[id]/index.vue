<script setup lang="ts">
import DeleteModal from '../components/DeleteModal.vue'
import StrategyStepsInput from './components/StrategyStepsInput/index.vue'
import StrategyStatsModal from './components/StrategyStatsModal/index.vue'
import { getIntervalLabelWithMinutes } from '~/components/app/MarketIntervalSelect/utils'

definePageMeta({
  key: route => `strategy-detail-${route.params.id}`,
  layout: 'app',
  title: 'pages.app.strategies._id_.title',
})

const route = useRoute()
const T = useTranslations('pages.app.strategies._id_')
const TC = useTranslations('common')
const request = useRequest()
const toast = useToast()
const dialog = useDialog()
const { isMobile } = useDevice()

const strategyId = computed(() => route.params.id as string)
const isNew = computed(() => strategyId.value === 'new')

// Duplicate mode: when creating a new strategy from an existing user strategy
const duplicateFromId = computed(() => isNew.value ? (route.query.strategyId as string | undefined) : undefined)

// Duplicate mode: when creating a new strategy from a market strategy
const duplicateFromMarketStrategyId = computed(() => isNew.value ? (route.query.marketStrategyId as string | undefined) : undefined)

// Strategy data state
const strategy = ref<StrategyDetail | null>(null)
const ready = ref(isNew.value && !duplicateFromId.value && !duplicateFromMarketStrategyId.value)

// Fetch strategy data (for edit mode or duplicate mode)
onMounted(fetchData)
async function fetchData () {
  // Edit mode: fetch the strategy
  if (!isNew.value) {
    try {
      const data = await request.get<StrategyDetail>(`/api/strategies/${strategyId.value}`)
      setValue(data)
      ready.value = true
    } catch (err) {
      console.error('Failed to fetch strategy:', err)
      navigateTo('/app/strategies', { replace: true })
    }
    return
  }

  // Duplicate mode: fetch the source strategy to copy from
  if (duplicateFromId.value) {
    try {
      const data = await request.get<StrategyDetail>(`/api/strategies/${duplicateFromId.value}`)
      // Assign to formState directly (not origin) so changed=true and save button is enabled
      formState.name = `${data.name} ${T('duplicateSuffix')}`
      formState.interval = data.interval
      formState.strategyJson = data.strategyJson
    } catch (err) {
      console.error('Failed to fetch source strategy:', err)
      // If source strategy not found, continue as normal create mode
    } finally {
      ready.value = true
    }
    return
  }

  // Duplicate mode: fetch market strategy to copy from
  if (duplicateFromMarketStrategyId.value) {
    try {
      const data = await request.get<MarketStrategyDetail>(`/api/market-strategies/${duplicateFromMarketStrategyId.value}`)
      // Assign to formState directly (not origin) so changed=true and save button is enabled
      formState.name = '' // User needs to provide a name
      formState.interval = data.interval as MarketIntervalType
      formState.strategyJson = data.strategyJson
    } catch (err) {
      console.error('Failed to fetch market strategy:', err)
      // If market strategy not found, continue as normal create mode
    } finally {
      ready.value = true
    }
  }
}

// Loading and modal states
const saving = ref(false)
const showDeleteModal = ref(false)
const showStatsModal = ref(false)

// Form state
const formState: {
  name: string
  interval: MarketIntervalType
  strategyJson: string
} = reactive({
  name: '',
  interval: MarketInterval.M15,
  strategyJson: '',
})

// Create schema for validation
const schema = computed(() => {
  return createApiValidationSchema(isNew.value ? 'POST' : 'PATCH', isNew.value ? '/api/strategies' : '/api/strategies/[id]')
})

// Use form composable
const { origin, validate, validateField, validationResult, changed } = useForm(formState, {
  schema,
  autoValidate: false,
})

// Interval options
const intervalOptions = [
  { label: getIntervalLabelWithMinutes(MarketInterval.M15), value: MarketInterval.M15 },
  { label: getIntervalLabelWithMinutes(MarketInterval.H1), value: MarketInterval.H1 },
  { label: getIntervalLabelWithMinutes(MarketInterval.H4), value: MarketInterval.H4 },
  { label: getIntervalLabelWithMinutes(MarketInterval.D1), value: MarketInterval.D1 },
]

// Current interval in minutes for StrategyStepsInput
const currentIntervalMinutes = computed(() => getIntervalMinutes(formState.interval))

// Handle save
async function handleSave () {
  saving.value = true

  try {
    const data = await validate()

    if (isNew.value) {
      const result = await request.post<StrategyDetail>('/api/strategies', data)
      toast.success(TC('messages.createSuccess'))
      navigateTo(`/app/strategies/${result.id}`, { replace: true })
    } else {
      const result = await request.patch<StrategyDetail>(`/api/strategies/${strategyId.value}`, data)
      setValue(result)
      toast.success(TC('messages.updateSuccess'))
      await fetchData()
    }
  } catch (err) {
    console.error('Failed to save strategy:', err)
  } finally {
    saving.value = false
  }
}

function setValue (data: StrategyDetail) {
  strategy.value = data
  origin.value = {
    name: data.name,
    interval: data.interval,
    strategyJson: data.strategyJson,
  }
}

// Handle delete success
function onDeleted () {
  showDeleteModal.value = false
  toast.success(TC('messages.deleteSuccess'))
  navigateTo('/app/strategies', { replace: true })
}

// Auto-generate strategy name from steps
function generateStrategyName () {
  const steps: TradeStep[] = safeJsonParse(formState.strategyJson, [])

  if (steps.length === 0) {
    dialog.alert({
      type: 'warn',
      message: T('autoNameNoSteps'),
    })
    return
  }

  const nameParts = steps.map(step => {
    const prefix = step.side === TradeSide.BUY ? 'B' : 'S'
    return `${prefix}${step.price}`
  })

  formState.name = nameParts.join(' - ')
}
</script>

<template>
  <PageCard
    :ready="ready"
    :loading="saving"
    back
  >
    <template #title>
      <div class="flex items-center justify-between">
        <span>{{ isNew ? T('titleCreate') : T('titleEdit') }}</span>
        <div class="flex shrink-0 gap-2">
          <Button
            v-if="!isNew"
            severity="secondary"
            outlined
            icon="pi pi-chart-bar"
            :size="isMobile ? 'small' : undefined"
            :label="isMobile ? undefined : T('actions.stats')"
            @click="showStatsModal = true"
          />
          <Button
            v-if="!isNew"
            severity="danger"
            outlined
            icon="pi pi-trash"
            :size="isMobile ? 'small' : undefined"
            @click="showDeleteModal = true"
          >
            {{ TC('actions.delete') }}
          </Button>
          <Button
            icon="pi pi-save"
            :size="isMobile ? 'small' : undefined"
            :loading="saving"
            :disabled="!changed"
            @click="handleSave"
          >
            {{ TC('actions.save') }}
          </Button>
        </div>
      </div>
    </template>

    <!-- Form -->
    <div class="flex flex-col gap-6">
      <div class="flex max-w-xl flex-col gap-6">
        <!-- Name Field -->
        <div class="flex flex-col gap-1">
          <FormLabel htmlFor="strategy-name">
            {{ T('fields.name') }}
          </FormLabel>
          <InputGroup>
            <Input
              id="strategy-name"
              v-model="formState.name"
              v-trim
              name="name"
              :placeholder="T('placeholders.name')"
              :invalid="!!validationResult.name"
              @change="validateField('name')"
            />
            <template #append>
              <Tooltip :text="T('autoNameTooltip')">
                <Button
                  icon="pi pi-sparkles"
                  severity="secondary"
                  @click="generateStrategyName"
                />
              </Tooltip>
            </template>
          </InputGroup>
          <FormError
            name="name"
            :errors="validationResult"
          />
        </div>

        <!-- Interval Field -->
        <div class="flex flex-col gap-1">
          <FormLabel htmlFor="strategy-interval">
            {{ T('fields.interval') }}
          </FormLabel>
          <Select
            v-if="isNew"
            id="strategy-interval"
            v-model="formState.interval"
            name="interval"
            :options="intervalOptions"
            :placeholder="T('placeholders.interval')"
            :invalid="!!validationResult.interval"
            @change="validateField('interval')"
          />
          <Tag
            v-else
            class="self-start"
            severity="secondary"
            :value="intervalOptions.find(o => o.value === formState.interval)?.label"
          />
          <FormError
            name="interval"
            :errors="validationResult"
          />
        </div>
      </div>

      <!-- Strategy Steps Field -->
      <div class="flex flex-col gap-1">
        <FormLabel>
          {{ T('fields.strategyJson') }}
        </FormLabel>
        <StrategyStepsInput
          v-model="formState.strategyJson"
          :intervalMinutes="currentIntervalMinutes"
          @update:modelValue="validateField('strategyJson')"
        />
        <FormError
          name="strategyJson"
          :errors="validationResult"
        />
      </div>
    </div>

    <!-- Delete Modal (edit mode only) -->
    <DeleteModal
      v-if="!isNew && strategy"
      v-model:visible="showDeleteModal"
      :strategy="strategy"
      @success="onDeleted"
    />

    <!-- Stats Modal (edit mode only) -->
    <StrategyStatsModal
      v-if="!isNew && strategy"
      v-model:visible="showStatsModal"
      :strategyJson="strategy.strategyJson"
      :interval="strategy.interval"
      statsOnly
    />
  </PageCard>
</template>
