<script setup lang="ts">
import BridgeAssetSelector from '../BridgeAssetSelector/index.vue'
import { useBridgeAssets } from '../../composables/useBridgeAssets'

export interface DepositModalProps {
  visible: boolean
  wallet: WalletItem | null
}

const props = defineProps<DepositModalProps>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const ns = 'pages.wallets.components.DepositModal'
const T = useTranslations(ns)
const request = useRequest()

const {
  selectedTokenSymbol,
  selectedChainName,
  allTokens,
  availableChains,
  selectedChain,
  selectedToken,
  isDirectTransfer,
  chainAddressType,
  fetchSupportedAssets,
  resetSelections,
  bridgeChains,
} = useBridgeAssets()

const loading = ref(false)
const addresses = ref<BridgeAddresses | null>(null)

/** Current deposit address based on selected chain/token */
const currentAddress = computed(() => {
  // USDC.e on Polygon: direct transfer to funder address
  if (isDirectTransfer.value && props.wallet) {
    return props.wallet.funder
  }
  if (!addresses.value) return ''
  return addresses.value[chainAddressType.value]
})

/** Minimum deposit amount (0 for USDC.e direct transfer) */
const minimumDeposit = computed(() => {
  if (isDirectTransfer.value) return 0
  return selectedToken.value?.minCheckoutUsd ?? 10
})

async function fetchDepositData () {
  if (!props.wallet) return
  loading.value = true
  addresses.value = null

  try {
    const [ depositResponse ] = await Promise.all([
      request.get<{ address: BridgeAddresses }>(`/api/wallets/${props.wallet.funder}/deposit`),
      bridgeChains.value.length === 0 ? fetchSupportedAssets() : Promise.resolve(),
    ])
    addresses.value = depositResponse.address ?? null
  } finally {
    loading.value = false
  }
}

watch(visible, value => {
  if (value) {
    fetchDepositData()
  } else {
    resetSelections()
    addresses.value = null
  }
})
</script>

<template>
  <Modal
    v-model:visible="visible"
    :title="T('title')"
    showClose
    hideFooter
  >
    <div class="flex flex-col gap-4">
      <!-- Minimum deposit warning (hidden for USDC.e) -->
      <Message
        v-if="minimumDeposit > 0"
        severity="warn"
      >
        <i18n-t :keypath="`${ns}.minimumDeposit`">
          <template #amount>
            <span class="font-semibold text-success">
              ${{ minimumDeposit }}
            </span>
          </template>
        </i18n-t>
      </Message>

      <!-- Token & Chain selection -->
      <BridgeAssetSelector
        v-model:tokenSymbol="selectedTokenSymbol"
        v-model:chainName="selectedChainName"
        :tokens="allTokens"
        :chains="availableChains"
      />

      <!-- Loading state -->
      <div
        v-if="loading"
        class="flex items-center justify-center py-8"
      >
        <Loading />
      </div>

      <!-- QR Code & Address -->
      <template v-else-if="currentAddress">
        <div class="flex flex-col items-center gap-4">
          <div class="relative rounded-lg bg-white p-4">
            <Qrcode
              :content="currentAddress"
              class="size-48"
            />
            <!-- Chain icon overlay -->
            <img
              :src="getChainIcon(selectedChain?.name ?? '')"
              :width="28"
              :height="28"
              :alt="selectedChain?.name"
              class="absolute right-2 bottom-2 rounded-full bg-white p-0.5"
            >
          </div>

          <div class="flex w-full flex-col gap-1">
            <FormLabel>
              {{ T('address') }}
            </FormLabel>
            <InputGroup>
              <Textarea
                :modelValue="currentAddress"
                readonly
                class="font-mono text-sm"
              />
              <template #append>
                <CopyButton
                  :copy="currentAddress"
                  severity="secondary"
                />
              </template>
            </InputGroup>
          </div>
        </div>
      </template>

      <!-- Direct deposit info for USDC.e -->
      <Message
        v-if="isDirectTransfer"
        severity="info"
      >
        {{ T('directDepositInfo') }}
      </Message>

      <!-- General info message for bridge deposits -->
      <Message
        v-else
        severity="info"
      >
        <i18n-t :keypath="`${ns}.note`">
          <template #bridgeAddress>
            <WebLink
              href="https://docs.polymarket.com/api-reference/bridge/create-deposit-addresses"
              target="_blank"
            >
              {{ T('bridgeAddress') }}
            </WebLink>
          </template>
          <template #supportedCrypto>
            <WebLink
              href="https://docs.polymarket.com/polymarket-learn/deposits/supported-tokens"
              target="_blank"
            >
              {{ T('supportedCrypto') }}
            </WebLink>
          </template>
        </i18n-t>
      </Message>
    </div>
  </Modal>
</template>
