<script setup lang="ts">
export interface TransactionResultProps {
  transactionHash: string | null
  walletActivating: boolean
  activatingFunder: string | null
  successMessage: string
  activatingMessage: string
}

const props = defineProps<TransactionResultProps>()

const T = useTranslations('pages.wallets.components.TransactionResult')
const TC = useTranslations('common')

const polygonScanUrl = computed(() => {
  if (!props.transactionHash) return ''
  return getExplorerTxUrl('Polygon', props.transactionHash)
})

const funderPolygonScanUrl = computed(() => {
  if (!props.activatingFunder) return ''
  return getExplorerAddressUrl('Polygon', props.activatingFunder)
})
</script>

<template>
  <!-- Success state: show transaction hash -->
  <div
    v-if="transactionHash"
    class="flex flex-col gap-4"
  >
    <Message severity="success">
      {{ successMessage }}
    </Message>

    <div class="flex flex-col gap-1">
      <FormLabel>{{ TC('labels.transactionHash') }}</FormLabel>
      <InputGroup>
        <Textarea
          :modelValue="transactionHash || ''"
          readonly
          class="font-mono text-sm"
        />
        <template #append>
          <CopyButton
            :copy="transactionHash || ''"
            severity="secondary"
          />
        </template>
      </InputGroup>
    </div>

    <WebLink
      :href="polygonScanUrl"
      class="flex items-center justify-center gap-2"
    >
      <img
        :src="getChainIcon('Polygon')"
        :width="20"
        :height="20"
        alt="Polygon"
      >
      <span>{{ T('viewOnPolygonscan') }}</span>
    </WebLink>
  </div>

  <!-- Wallet activating state -->
  <div
    v-else-if="walletActivating"
    class="flex flex-col gap-4"
  >
    <Message severity="info">
      {{ activatingMessage }}
    </Message>

    <WebLink
      :href="funderPolygonScanUrl"
      class="flex items-center justify-center gap-2"
    >
      <img
        :src="getChainIcon('Polygon')"
        :width="20"
        :height="20"
        alt="Polygon"
      >
      <span>{{ T('viewWalletOnPolygonscan') }}</span>
    </WebLink>
  </div>
</template>
