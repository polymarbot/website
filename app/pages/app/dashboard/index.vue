<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'pages.app.dashboard.name',
})

const T = useTranslations('pages.app.dashboard')
const request = useRequest()

// Stats data
const stats = ref<{
  walletCount: number
  strategyCount: number
  botCount: number
  runningBotCount: number
} | null>(null)
const statsLoading = ref(true)

// Balance data
const balance = ref<{
  totalBalance: string
  walletCount: number
} | null>(null)
const balanceLoading = ref(true)

// Load stats
async function loadStats () {
  statsLoading.value = true
  try {
    stats.value = await request.get('/api/dashboard/stats')
  } finally {
    statsLoading.value = false
  }
}

// Load balance
async function loadBalance () {
  balanceLoading.value = true
  try {
    balance.value = await request.get('/api/dashboard/balance')
  } finally {
    balanceLoading.value = false
  }
}

// Profit history data
const profitHistory = ref<{ data: DailyProfit[] } | null>(null)
const profitHistoryLoading = ref(true)

// Load profit history
async function loadProfitHistory () {
  profitHistoryLoading.value = true
  try {
    profitHistory.value = await request.get('/api/dashboard/profit-history', {
      query: { days: 30 },
    })
  } finally {
    profitHistoryLoading.value = false
  }
}

// Load all data on mount
onMounted(() => {
  loadStats()
  loadBalance()
  loadProfitHistory()
})
</script>

<template>
  <PageCard :title="T('name')">
    <div
      class="
        grid grid-cols-2 gap-4
        md:grid-cols-3
        lg:grid-cols-4
      "
    >
      <!-- Total Balance Card -->
      <WebLink
        to="/app/wallets"
        unstyled
      >
        <Card
          class="
            h-full cursor-pointer bg-surface-alt transition-all
            hover:scale-[1.02] hover:shadow-lg
          "
        >
          <template #title>
            <span class="text-muted-color">
              {{ T('totalBalance') }}
            </span>
          </template>
          <template #content>
            <Skeleton
              v-if="balanceLoading"
              width="8rem"
              height="2rem"
            />
            <EffectAutoScale
              v-else
              align="left"
            >
              <div class="flex items-baseline gap-2">
                <span class="text-3xl font-bold">
                  {{ formatCurrency(balance?.totalBalance ?? '0') }}
                </span>
              </div>
            </EffectAutoScale>
          </template>
        </Card>
      </WebLink>

      <!-- Wallet Count Card -->
      <WebLink
        to="/app/wallets"
        unstyled
      >
        <Card
          class="
            h-full cursor-pointer bg-surface-alt transition-all
            hover:scale-[1.02] hover:shadow-lg
          "
        >
          <template #title>
            <span class="text-muted-color">
              {{ T('walletCount') }}
            </span>
          </template>
          <template #content>
            <Skeleton
              v-if="statsLoading"
              width="4rem"
              height="2rem"
            />
            <EffectAutoScale
              v-else
              align="left"
            >
              <span class="text-3xl font-bold">
                {{ stats?.walletCount ?? 0 }}
              </span>
            </EffectAutoScale>
          </template>
        </Card>
      </WebLink>

      <!-- Strategy Count Card -->
      <WebLink
        to="/app/strategies"
        unstyled
      >
        <Card
          class="
            h-full cursor-pointer bg-surface-alt transition-all
            hover:scale-[1.02] hover:shadow-lg
          "
        >
          <template #title>
            <span class="text-muted-color">
              {{ T('strategyCount') }}
            </span>
          </template>
          <template #content>
            <Skeleton
              v-if="statsLoading"
              width="4rem"
              height="2rem"
            />
            <EffectAutoScale
              v-else
              align="left"
            >
              <span class="text-3xl font-bold">
                {{ stats?.strategyCount ?? 0 }}
              </span>
            </EffectAutoScale>
          </template>
        </Card>
      </WebLink>

      <!-- Bot Count Card -->
      <WebLink
        to="/app/bots"
        unstyled
      >
        <Card
          class="
            h-full cursor-pointer bg-surface-alt transition-all
            hover:scale-[1.02] hover:shadow-lg
          "
        >
          <template #title>
            <span class="text-muted-color">
              {{ T('botCount') }}
            </span>
          </template>
          <template #content>
            <Skeleton
              v-if="statsLoading"
              width="4rem"
              height="2rem"
            />
            <EffectAutoScale
              v-else
              align="left"
            >
              <div class="flex items-baseline gap-2">
                <span class="text-3xl font-bold">
                  {{ stats?.botCount ?? 0 }}
                </span>
                <span class="text-sm text-success">
                  ({{ stats?.runningBotCount ?? 0 }} {{ T('running') }})
                </span>
              </div>
            </EffectAutoScale>
          </template>
        </Card>
      </WebLink>
    </div>

    <!-- Profit History Chart -->
    <Card class="mt-4 bg-surface-alt">
      <template #title>
        <span class="text-muted-color">
          {{ T('profitHistory.title') }}
        </span>
      </template>
      <template #content>
        <ChartProfitHistory
          :data="profitHistory?.data ?? []"
          :loading="profitHistoryLoading"
          height="400px"
        />
      </template>
    </Card>
  </PageCard>
</template>
