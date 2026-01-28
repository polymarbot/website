<script setup lang="ts">
interface Wallet {
  funder: string
  name: string
  createdAt: string
}

interface DepositAddresses {
  evm: string
  svm: string
  btc: string
}

export interface DepositModalProps {
  visible: boolean
  wallet: Wallet | null
}

const props = defineProps<DepositModalProps>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const ns = 'pages.app.wallets.components.DepositModal'
const T = useTranslations(ns)
const request = useRequest()

const loading = ref(false)
const addresses = ref<DepositAddresses | null>(null)
const selectedChain = ref<'evm' | 'svm' | 'btc'>('evm')

// Fetch deposit addresses when modal opens
watch(visible, async value => {
  if (value && props.wallet) {
    loading.value = true
    addresses.value = null

    try {
      const response = await request.get<{ address: DepositAddresses }>(`/api/wallets/${props.wallet.funder}/deposit`)
      addresses.value = response.address ?? null
    } finally {
      loading.value = false
    }
  }
})

const currentAddress = computed(() => {
  if (!addresses.value) return ''
  return addresses.value[selectedChain.value]
})

const chainOptions = [
  { label: 'EVM (Ethereum, Polygon, etc.)', value: 'evm' },
  { label: 'Solana', value: 'svm' },
  { label: 'Bitcoin', value: 'btc' },
]

</script>

<template>
  <Modal
    v-model:visible="visible"
    :title="T('title')"
    showClose
    hideFooter
  >
    <div class="flex flex-col gap-4">
      <div
        v-if="loading"
        class="flex items-center justify-center py-8"
      >
        <Loading />
      </div>

      <template v-else-if="addresses">
        <div class="flex flex-col gap-1">
          <FormLabel>{{ T('selectChain') }}</FormLabel>
          <Select
            v-model="selectedChain"
            :options="chainOptions"
          />
        </div>

        <div class="flex flex-col items-center gap-4">
          <div class="rounded-lg bg-white p-4">
            <Qrcode
              :content="currentAddress"
              class="size-48"
            />
          </div>

          <div class="w-full">
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

        <Message severity="info">
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
      </template>
    </div>
  </Modal>
</template>
