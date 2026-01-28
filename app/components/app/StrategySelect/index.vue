<script setup lang="ts">
import type { LoadMethodParams, LoadMethodResult, SelectOption } from '~/components/ui/SearchSelect/index.vue'

type StrategySelectOption = SelectOption<string, StrategyItem>

const props = defineProps<{
  modelValue?: string
  interval?: MarketIntervalType
  /** Raw strategy data to display as default options at the top of the list */
  defaultOptionsMetadata?: StrategyItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

const model = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const T = useTranslations('components.app.StrategySelect')
const request = useRequest()

const searchSelectRef = ref<{ refresh: () => Promise<void> } | null>(null)

// Watch interval changes to refresh options and clear selection
watch(() => props.interval, () => {
  model.value = undefined
  searchSelectRef.value?.refresh()
})

// Whether to show interval in option (when interval prop is not specified)
const showInterval = computed(() => !props.interval)

// Convert strategy to SelectOption format with metadata
function toOption (strategy: StrategyItem): StrategySelectOption {
  return {
    label: strategy.name,
    value: strategy.id,
    meta: strategy,
  }
}

// Convert raw strategy metadata to SelectOption format
const defaultOptions = computed(() => {
  return props.defaultOptionsMetadata?.map(toOption)
})

// Load strategies from API with keyword, offset, limit and optional interval filter
async function loadStrategies (params: LoadMethodParams): Promise<LoadMethodResult<string, StrategyItem>> {
  const response = await request.get<{
    items: StrategyItem[]
    pagination: { total: number }
  }>('/api/strategies', {
    query: {
      keyword: params.keyword || undefined,
      offset: params.offset,
      limit: params.limit,
      interval: props.interval || undefined,
    },
  })

  return {
    items: (response.items ?? []).map(toOption),
    total: response.pagination.total,
  }
}

// Load single strategy option by id
async function loadStrategyOption (id: string): Promise<StrategySelectOption | null> {
  try {
    const strategy = await request.get<StrategyItem>(`/api/strategies/${id}`)
    return toOption(strategy)
  } catch {
    return null
  }
}
</script>

<template>
  <SearchSelect
    ref="searchSelectRef"
    v-model="model"
    :placeholder="T('placeholder')"
    :emptyMessage="T('emptyMessage')"
    :loadMethod="loadStrategies"
    :loadValueOptionMethod="loadStrategyOption"
    :defaultOptions="defaultOptions"
    :createNewTo="'/app/strategies'"
    :createNewText="T('createNew')"
    autoLoad
  >
    <template #value="{ option }">
      <div class="flex min-w-0 items-center gap-1">
        <span class="truncate">
          {{ option?.label }}
        </span>
        <span
          v-if="option?.meta?.amount"
          class="shrink-0 text-muted-color"
        >
          ({{ formatCurrency(option.meta.amount) }})
        </span>
      </div>
    </template>

    <template #option="{ option }">
      <div class="flex w-full items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-1">
          <span class="truncate">
            {{ option.label }}
          </span>
          <span
            v-if="option.meta?.amount"
            class="shrink-0 text-muted-color"
          >
            ({{ formatCurrency(option.meta.amount) }})
          </span>
        </div>
        <Tag
          v-if="showInterval && option.meta?.interval"
          severity="secondary"
          :value="formatIntervalMinutes(option.meta.interval)"
        />
      </div>
    </template>
  </SearchSelect>
</template>
