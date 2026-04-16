<script setup lang="ts">
import type { InfoTableCell } from '@packages/layer-basic/app/components/ui/InfoTable/index.vue'

export interface BotInfoTableProps {
  bot: BotItem
}

const props = defineProps<BotInfoTableProps>()

const T = useTranslations('pages.bots.components.BotInfoTable')
const TC = useTranslations('common')

const rows = computed<InfoTableCell[][]>(() => [
  [
    {
      label: T('wallet'),
      slot: 'wallet',
      data: props.bot,
    },
  ],
  [
    {
      label: T('strategy'),
      slot: 'strategy',
      data: props.bot,
    },
  ],
])
</script>

<template>
  <InfoTable
    :rows="rows"
    class="mb-4"
  >
    <template #wallet="{ cell }">
      <AppAddressDisplay
        :name="cell.data.wallet.name"
        :address="cell.data.funder"
        :balance="cell.data.wallet.balance"
        :href="getPolymarketProfileUrl(cell.data.funder)"
        :tooltip="TC('labels.viewOnPolymarket')"
        copyable
      />
    </template>

    <template #strategy="{ cell }">
      <AppStrategyDisplay
        :name="cell.data.strategy.name"
        :amount="cell.data.strategy.amount"
        :maxBuySize="cell.data.strategy.maxBuySize"
        :strategyId="cell.data.strategyId"
      />
    </template>
  </InfoTable>
</template>
