<script setup lang="ts">
import BridgeAssetSelector from '../BridgeAssetSelector/index.vue'
import TransactionResult from '../TransactionResult/index.vue'
import { useBridgeAssets } from '../../composables/useBridgeAssets'

export interface WithdrawModalProps {
  visible: boolean
  wallet: WalletItem | null
}

const props = defineProps<WithdrawModalProps>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'success': []
}>()

const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const T = useTranslations('pages.wallets.components.WithdrawModal')
const TW = useTranslations('pages.wallets')
const TC = useTranslations('common')
const request = useRequest()
const toast = useToast()

const {
  bridgeChains,
  selectedTokenSymbol,
  selectedChainName,
  allTokens,
  availableChains,
  selectedChain,
  selectedToken,
  isDirectTransfer,
  tokenExplorerUrl,
  fetchSupportedAssets,
  resetSelections,
} = useBridgeAssets()

// ----------------------------------------------------------------------------
// State
// ----------------------------------------------------------------------------

const loading = ref(false)
const transactionHash = ref<string | null>(null)
const walletActivating = ref(false)
const activatingFunder = ref<string | null>(null)

const loadingQuote = ref(false)
const quoteResult = ref<BridgeQuoteResponse | null>(null)
const quoteError = ref(false)

const formState = reactive({
  recipientAddr: '',
  amount: 0,
  toChainId: 0,
  toTokenAddress: '',
})

const { validate, validateField, resetToDefault, validationResult } = useForm(formState, {
  schema: createApiValidationSchema('POST', '/api/wallets/[funder]/withdraw'),
  autoValidate: false,
})

// ----------------------------------------------------------------------------
// Computed
// ----------------------------------------------------------------------------

const balanceNum = computed(() => {
  if (!props.wallet?.balance) return 0
  return parseFloat(props.wallet.balance)
})

const amountExceedsBalance = computed(() => {
  if (!formState.amount) return false
  return formState.amount > balanceNum.value
})

const isFormValid = computed(() => {
  return formState.recipientAddr.length > 0
    && formState.amount > 0
    && !amountExceedsBalance.value
    && selectedToken.value !== undefined
    && !validationResult.value.recipientAddr
    && !validationResult.value.amount
})

const canFetchQuote = computed(() => {
  if (isDirectTransfer.value) return false
  if (!selectedChain.value || !selectedToken.value) return false
  if (!formState.recipientAddr || !formState.amount) return false
  if (amountExceedsBalance.value) return false
  if (validationResult.value.recipientAddr || validationResult.value.amount) return false
  return true
})

// ----------------------------------------------------------------------------
// Quote
// ----------------------------------------------------------------------------

let quoteTimer: ReturnType<typeof setTimeout> | null = null

/** Debounce fetch quote — only checks current state, does NOT trigger validation */
function tryFetchQuote () {
  if (quoteTimer) clearTimeout(quoteTimer)
  quoteResult.value = null
  quoteError.value = false

  if (isDirectTransfer.value || !selectedToken.value) return

  quoteTimer = setTimeout(() => {
    if (canFetchQuote.value) {
      fetchQuote()
    }
  }, 400)
}

async function fetchQuote () {
  loadingQuote.value = true
  quoteError.value = false
  try {
    const response = await request.post<BridgeQuoteResponse>(
      '/api/wallets/bridge-quote',
      {
        toChainId: selectedChain.value!.chainId,
        toTokenAddress: selectedToken.value!.address,
        recipientAddr: formState.recipientAddr,
        amount: String(formState.amount),
      },
    )
    quoteResult.value = response
  } catch (err) {
    console.error('Failed to get bridge quote:', err)
    quoteError.value = true
  } finally {
    loadingQuote.value = false
  }
}

// ----------------------------------------------------------------------------
// Watchers
// ----------------------------------------------------------------------------

// Sync chain → formState, re-validate address format, refresh quote
watch(selectedChain, () => {
  formState.toChainId = selectedChain.value?.chainId ?? 0
  if (formState.recipientAddr) {
    validateField('recipientAddr')
  }
  tryFetchQuote()
})

// Sync token → formState, refresh quote
watch(selectedToken, () => {
  formState.toTokenAddress = selectedToken.value?.address ?? ''
  tryFetchQuote()
})

watch(visible, value => {
  if (value) {
    if (bridgeChains.value.length === 0) {
      fetchSupportedAssets()
    }
  } else {
    resetToDefault()
    resetSelections()
    transactionHash.value = null
    walletActivating.value = false
    activatingFunder.value = null
    quoteResult.value = null
    quoteError.value = false
    if (quoteTimer) clearTimeout(quoteTimer)
  }
})

// ----------------------------------------------------------------------------
// Handlers
// ----------------------------------------------------------------------------

function onAddressValidated () {
  validateField('recipientAddr')
  tryFetchQuote()
}

function onAmountValidated () {
  validateField('amount')
  tryFetchQuote()
}

function onAddressPasted (pastedText: string) {
  formState.recipientAddr = pastedText
  onAddressValidated()
}

function setMaxAmount () {
  if (balanceNum.value) {
    formState.amount = balanceNum.value
    validateField('amount')
    tryFetchQuote()
  }
}

type WithdrawResponse = { transactionHash?: string, walletActivating?: boolean, funder?: string }

async function handleConfirm () {
  loading.value = true

  try {
    const data = await validate()

    const response = isDirectTransfer.value
      ? await request.post<WithdrawResponse>(
        `/api/wallets/${props.wallet?.funder}/transfer`,
        { toAddress: data.recipientAddr, amount: data.amount },
      )
      : await request.post<WithdrawResponse>(
        `/api/wallets/${props.wallet?.funder}/withdraw`,
        data,
      )

    if (response.walletActivating) {
      walletActivating.value = true
      activatingFunder.value = response.funder ?? null
    } else if (response.transactionHash) {
      transactionHash.value = response.transactionHash
    }

    toast.success(TC('messages.submitSuccess'))
    emit('success')
  } catch (err) {
    console.error('Failed to withdraw:', err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Modal
    :visible="visible"
    :title="T('title')"
    :loading="loading"
    :confirmDisabled="!isFormValid"
    :hideFooter="!!transactionHash || walletActivating"
    showCancel
    showClose
    @cancel="visible = false"
    @confirm="handleConfirm"
  >
    <TransactionResult
      v-if="transactionHash || walletActivating"
      :transactionHash="transactionHash"
      :walletActivating="walletActivating"
      :activatingFunder="activatingFunder"
      :successMessage="isDirectTransfer ? T('submitted') : T('submittedBridge')"
      :activatingMessage="T('walletActivating')"
    />

    <div
      v-else
      class="flex flex-col gap-4"
    >
      <!-- Token & Chain selection -->
      <BridgeAssetSelector
        v-model:tokenSymbol="selectedTokenSymbol"
        v-model:chainName="selectedChainName"
        :tokens="allTokens"
        :chains="availableChains"
      >
        <WebLink
          v-if="selectedToken && tokenExplorerUrl"
          :href="tokenExplorerUrl"
          class="
            mt-1 block truncate text-sm text-muted-color
            hover:text-primary
          "
        >
          {{ selectedToken.address }}
        </WebLink>
      </BridgeAssetSelector>

      <!-- Recipient Address -->
      <div class="flex flex-col gap-1">
        <FormLabel htmlFor="withdraw-to-address">
          {{ T('recipientAddress') }}
        </FormLabel>
        <InputGroup>
          <Textarea
            id="withdraw-to-address"
            v-model="formState.recipientAddr"
            v-trim
            name="recipientAddr"
            :placeholder="T('recipientPlaceholder')"
            :invalid="!!validationResult.recipientAddr"
            @change="onAddressValidated"
          />
          <template #append>
            <PasteButton
              severity="secondary"
              @pasted="onAddressPasted"
            />
          </template>
        </InputGroup>
        <FormError
          name="recipientAddr"
          :errors="validationResult"
        />
      </div>

      <!-- Amount -->
      <div class="flex flex-col gap-1">
        <FormLabel htmlFor="withdraw-amount">
          {{ TC('labels.amount') }}
        </FormLabel>
        <InputGroup>
          <InputNumber
            id="withdraw-amount"
            v-model="formState.amount"
            name="amount"
            :showButtons="false"
            :minFractionDigits="0"
            :maxFractionDigits="2"
            :min="0"
            :placeholder="TW('placeholders.amount')"
            :invalid="!!validationResult.amount || amountExceedsBalance"
            @update:modelValue="onAmountValidated"
          />
          <template #append>
            <Button
              severity="secondary"
              @click="setMaxAmount"
            >
              {{ TC('labels.max') }}
            </Button>
          </template>
        </InputGroup>
        <FormError
          name="amount"
          :errors="validationResult"
        />
        <p
          v-if="amountExceedsBalance && !validationResult.amount"
          class="text-sm text-danger"
        >
          {{ TW('messages.insufficientBalance') }}
        </p>
      </div>

      <!-- Balance -->
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted-color">
          {{ TW('labels.availableBalance') }}
        </span>
        <span class="flex items-center gap-1 font-medium">
          {{ formatCurrency(balanceNum) }}
          <IconUSDC :size="14" />
        </span>
      </div>

      <!-- Bridge quote (only for cross-chain transfers) -->
      <template v-if="!isDirectTransfer">
        <div
          v-if="loadingQuote"
          class="flex items-center gap-2 text-sm text-muted-color"
        >
          <i class="pi pi-spinner pi-spin" />
          <span>{{ T('loadingQuote') }}</span>
        </div>

        <div
          v-else-if="quoteResult"
          class="
            flex flex-col gap-2 rounded-md border border-surface p-3 text-sm
          "
        >
          <div class="flex items-center justify-between">
            <span class="text-muted-color">
              {{ T('estimatedOutput') }}
            </span>
            <span class="flex items-center gap-1 font-medium">
              {{ quoteResult.estimatedOutput }} {{ selectedToken?.symbol }}
            </span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-color">
              {{ T('fee') }}
            </span>
            <span>${{ quoteResult.feeUsd }} ({{ quoteResult.feePercent }}%)</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-color">
              {{ T('estimatedTime') }}
            </span>
            <span>{{ T('seconds', { time: quoteResult.estimatedTime }) }}</span>
          </div>
        </div>

        <Message
          v-else-if="quoteError"
          severity="warn"
        >
          {{ T('quoteError') }}
        </Message>
      </template>

      <!-- USDC.e warning -->
      <Message
        v-if="selectedTokenSymbol === 'USDC.e'"
        severity="warn"
      >
        <strong>{{ T('usdceWarningTitle') }}</strong><br>
        {{ T('usdceWarningBody') }}
      </Message>

      <!-- Info -->
      <Message severity="info">
        {{ isDirectTransfer ? T('directInfo') : T('bridgeInfo') }}
      </Message>
    </div>
  </Modal>
</template>
