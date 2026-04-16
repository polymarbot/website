<script setup lang="ts">
import BotInfoTable from '../components/BotInfoTable/index.vue'

definePageMeta({
  key: route => `bot-operation-history-${route.params.botId}`,
  title: 'pages.bots._botId_.operation-history.title',
})

const route = useRoute()
const T = useTranslations('pages.bots._botId_.operation-history')
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
  const basePath = `/bots/${botId.value}/operation-history`
  if (value === 'logs') {
    navigateTo(`${basePath}/fun-logs`, { replace: true })
  } else {
    navigateTo(basePath, { replace: true })
  }
}
</script>

<template>
  <PageCard
    :title="T('title')"
    back
  >
    <BotInfoTable
      v-if="bot"
      :bot="bot"
    />

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
