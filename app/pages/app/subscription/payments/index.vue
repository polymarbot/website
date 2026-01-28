<script setup lang="ts">
import type { DataTableColumn } from '~/components/ui/DataTable/index.vue'
import type {
  AsyncDataTableFetchParams,
  AsyncDataTableFetchResult,
} from '~/components/ui/AsyncDataTable/index.vue'

definePageMeta({
  layout: 'app',
  title: 'pages.app.subscription.payments.name',
})

const T = useTranslations('pages.app.subscription.payments')
const { t } = useI18n()
const request = useRequest()
const { formatDate } = useDate()

// Fetch payment history for AsyncDataTable
async function fetchPayments ({ offset, limit }: AsyncDataTableFetchParams): Promise<AsyncDataTableFetchResult<SubscriptionPaymentItem>> {
  const response = await request.get<{
    items: SubscriptionPaymentItem[]
    pagination: { total: number }
  }>('/api/subscription/payments', {
    query: { offset, limit },
  })
  return {
    items: response.items ?? [],
    total: response.pagination.total ?? 0,
  }
}

// Get plan display name
function getPlanName (plan: SubscriptionPlanType): string {
  return SUBSCRIPTION_PLANS[plan]?.name ?? plan
}

// Get display status (expired pending payments show as EXPIRED)
function getDisplayStatus (row: SubscriptionPaymentItem): string {
  if (row.status === PaymentStatus.PENDING && new Date(row.chargeExpiresAt) < new Date()) {
    return 'EXPIRED'
  }
  return row.status
}

const statusSeverityMap: Record<string, 'success' | 'warn' | 'danger' | 'secondary'> = {
  CONFIRMED: 'success',
  PENDING: 'warn',
  FAILED: 'danger',
  EXPIRED: 'secondary',
}

function getStatusSeverity (row: SubscriptionPaymentItem) {
  return statusSeverityMap[getDisplayStatus(row)] ?? 'secondary'
}

// Table columns definition
const columns: DataTableColumn[] = [
  {
    field: 'chargeCode',
    title: T('table.chargeCode'),
  },
  {
    field: 'plan',
    title: T('table.plan'),
  },
  {
    field: 'billingCycle',
    title: T('table.billingCycle'),
  },
  {
    field: 'amount',
    title: T('table.amount'),
  },
  {
    field: 'status',
    title: T('table.status'),
  },
  {
    field: 'createdAt',
    title: T('table.createdAt'),
    type: 'date',
  },
]
</script>

<template>
  <PageCard
    :title="T('title')"
    back
  >
    <AsyncDataTable
      :columns="columns"
      :fetchMethod="fetchPayments"
      :tableProps="{ scrollable: true, scrollHeight: 'flex' }"
    >
      <!-- Charge Code column -->
      <template #chargeCode="{ row }">
        <WebLink
          :href="row.hostedUrl"
          class="font-mono text-sm"
        >
          {{ row.chargeCode }}
        </WebLink>
      </template>

      <!-- Plan column -->
      <template #plan="{ row }">
        <span class="font-medium">
          {{ getPlanName(row.plan) }}
        </span>
      </template>

      <!-- Billing Cycle column -->
      <template #billingCycle="{ row }">
        {{ t(`pages.app.subscription.billingCycle.${row.billingCycle}`) }}
      </template>

      <!-- Amount column -->
      <template #amount="{ row }">
        <span class="font-medium">
          {{ formatCurrency(row.amount) }} {{ row.currency }}
        </span>
      </template>

      <!-- Status column -->
      <template #status="{ row }">
        <Tag
          :severity="getStatusSeverity(row)"
          size="small"
        >
          {{ T(`status.${getDisplayStatus(row)}`) }}
        </Tag>
      </template>

      <!-- Created At column -->
      <template #createdAt="{ row }">
        {{ formatDate(row.createdAt) }}
      </template>
    </AsyncDataTable>
  </PageCard>
</template>
