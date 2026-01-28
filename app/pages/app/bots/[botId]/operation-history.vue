<script setup lang="ts">
import type { InfoTableCell } from '~/components/ui/InfoTable/index.vue'

definePageMeta({
  key: route => `bot-operation-history-${route.params.botId}`,
  layout: 'app',
  title: 'pages.app.bots._botId_.operation-history.title',
})

const route = useRoute()
const T = useTranslations('pages.app.bots._botId_.operation-history')
const request = useRequest()

// Get bot id from route
const botId = computed(() => route.params.botId as string)

// Bot data
const bot = ref<BotItem | null>(null)

// Load bot details
async function loadBot () {
  bot.value = await request.get(`/api/bots/${botId.value}`)
}

// Load bot on mount
onMounted(loadBot)

// Tab options
const tabOptions = computed(() => [
  { label: T('tabs.operations'), value: 'operations' },
  { label: T('tabs.logs'), value: 'logs' },
])

// Current tab based on route
const currentTab = computed(() => {
  const path = route.path
  if (path.endsWith('/fun-logs')) {
    return 'logs'
  }
  return 'operations'
})

// Handle tab change
function handleTabChange (value: string) {
  const basePath = `/app/bots/${botId.value}/operation-history`
  if (value === 'logs') {
    navigateTo(`${basePath}/fun-logs`, { replace: true })
  } else {
    navigateTo(basePath, { replace: true })
  }
}

// Info table data
const infoTableRows = computed<InfoTableCell[][]>(() => {
  if (!bot.value) return []

  return [
    [
      {
        label: T('info.wallet'),
        slot: 'wallet',
        data: bot.value,
      },
    ],
    [
      {
        label: T('info.strategy'),
        slot: 'strategy',
        data: bot.value,
      },
    ],
  ]
})
</script>

<template>
  <PageCard
    :title="T('title')"
    back
  >
    <!-- Bot Info -->
    <InfoTable
      v-if="bot"
      :rows="infoTableRows"
      class="mb-4"
    >
      <template #wallet="{ cell }">
        <AppAddressDisplay
          :name="cell.data.wallet.name"
          :address="cell.data.funder"
          :balance="cell.data.wallet.balance"
        />
      </template>

      <template #strategy="{ cell }">
        <AppStrategyDisplay
          :name="cell.data.strategy.name"
          :amount="cell.data.strategy.amount"
          :strategyId="cell.data.strategyId"
        />
      </template>
    </InfoTable>

    <!-- Tab Selector -->
    <div class="mb-4">
      <SelectButton
        :modelValue="currentTab"
        :options="tabOptions"
        @update:modelValue="handleTabChange"
      />
    </div>

    <!-- Child Route Content -->
    <NuxtPage />
  </PageCard>
</template>
