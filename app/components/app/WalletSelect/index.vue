<script setup lang="ts">
import type { LoadMethodParams, LoadMethodResult, SelectOption } from '~/components/ui/SearchSelect/index.vue'

export interface BotFilters {
  symbol?: string
  interval?: string
  exclude?: boolean
}

export interface WalletFilters {
  funders?: string[]
  exclude?: boolean
}

type WalletSelectOption = SelectOption<string, WalletItem>

const props = defineProps<{
  modelValue?: string
  botFilters?: BotFilters
  walletFilters?: WalletFilters
  /** Raw wallet data to display as default options at the top of the list */
  defaultOptionsMetadata?: WalletItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined]
}>()

const model = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})

const T = useTranslations('components.app.WalletSelect')
const request = useRequest()

const searchSelectRef = ref<{ refresh: () => Promise<void> } | null>(null)

// Watch botFilters changes to refresh options and clear selection
watch(() => props.botFilters, () => {
  model.value = undefined
  searchSelectRef.value?.refresh()
}, { deep: true })

// Watch walletFilters changes to refresh options and clear selection
watch(() => props.walletFilters, () => {
  model.value = undefined
  searchSelectRef.value?.refresh()
}, { deep: true })

// Convert wallet to SelectOption format with metadata
function toOption (wallet: WalletItem): WalletSelectOption {
  return {
    label: wallet.name,
    value: wallet.funder,
    meta: wallet,
  }
}

// Convert raw wallet metadata to SelectOption format
const defaultOptions = computed(() => {
  return props.defaultOptionsMetadata?.map(toOption)
})

// Load wallets from API with keyword, offset, limit and optional bot filters
async function loadWallets (params: LoadMethodParams): Promise<LoadMethodResult<string, WalletItem>> {
  const query: Record<string, unknown> = {
    keyword: params.keyword || undefined,
    offset: params.offset,
    limit: params.limit,
  }

  // Add bot filters if provided
  if (props.botFilters) {
    if (props.botFilters.symbol) {
      query['botFilters.symbol'] = props.botFilters.symbol
    }
    if (props.botFilters.interval) {
      query['botFilters.interval'] = props.botFilters.interval
    }
    if (props.botFilters.exclude !== undefined) {
      query['botFilters.exclude'] = props.botFilters.exclude
    }
  }

  // Add wallet filters if provided
  if (props.walletFilters) {
    if (props.walletFilters.funders?.length) {
      query['walletFilters.funders'] = props.walletFilters.funders.join(',')
    }
    if (props.walletFilters.exclude !== undefined) {
      query['walletFilters.exclude'] = props.walletFilters.exclude
    }
  }

  const response = await request.get<{
    items: WalletItem[]
    pagination: { total: number }
  }>('/api/wallets', { query })

  return {
    items: (response.items ?? []).map(toOption),
    total: response.pagination.total,
  }
}

// Load single wallet option by funder address
async function loadWalletOption (funder: string): Promise<WalletSelectOption | null> {
  try {
    const wallet = await request.get<WalletItem>(`/api/wallets/${funder}`)
    return toOption(wallet)
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
    :loadMethod="loadWallets"
    :loadValueOptionMethod="loadWalletOption"
    :defaultOptions="defaultOptions"
    :createNewTo="'/app/wallets'"
    :createNewText="T('createNew')"
    autoLoad
  >
    <template #value="{ option }">
      <div class="flex min-w-0 items-center gap-1">
        <span class="truncate">
          {{ option?.label }}
        </span>
        <span
          v-if="option?.meta?.balance"
          class="shrink-0 text-muted-color"
        >
          ({{ formatCurrency(option.meta.balance) }})
        </span>
      </div>
    </template>

    <template #option="{ option }">
      <div class="flex min-w-0 items-center gap-1">
        <span class="truncate">
          {{ option.label }}
        </span>
        <span
          v-if="option.meta?.balance"
          class="shrink-0 text-muted-color"
        >
          ({{ formatCurrency(option.meta.balance) }})
        </span>
      </div>
    </template>
  </SearchSelect>
</template>
