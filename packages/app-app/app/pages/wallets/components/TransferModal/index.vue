<script setup lang="ts">
import TransactionResult from '../TransactionResult/index.vue'

export interface TransferModalProps {
  visible: boolean
  wallet: WalletItem | null
}

const props = defineProps<TransferModalProps>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'success': []
}>()

const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const T = useTranslations('pages.wallets.components.TransferModal')
const TW = useTranslations('pages.wallets')
const TC = useTranslations('common')
const request = useRequest()
const toast = useToast()

const loading = ref(false)
const transactionHash = ref<string | null>(null)
const walletActivating = ref(false)
const activatingFunder = ref<string | null>(null)

const formState: {
  toAddress: string | undefined
  amount: number
} = reactive({
  toAddress: undefined,
  amount: 0,
})

// Use form composable with manual validation on change
const { validate, validateField, resetToDefault, validationResult } = useForm(formState, {
  schema: createApiValidationSchema('POST', '/api/wallets/[funder]/transfer'),
  autoValidate: false,
})

// Computed balance as number
const balanceNum = computed(() => {
  if (!props.wallet?.balance) return 0
  return parseFloat(props.wallet.balance)
})

// Check if amount exceeds balance
const amountExceedsBalance = computed(() => {
  if (!formState.amount) return false
  return formState.amount > balanceNum.value
})

// Form valid check
const isFormValid = computed(() => {
  return formState.toAddress && formState.amount > 0 && !amountExceedsBalance.value
})

// Set max amount
function setMaxAmount () {
  if (balanceNum.value) {
    formState.amount = balanceNum.value
    validateField('amount')
  }
}

// Handle confirm button click
async function handleConfirm () {
  loading.value = true

  try {
    const data = await validate()

    const response = await request.post<{
      transactionHash?: string
      walletActivating?: boolean
      funder?: string
    }>(`/api/wallets/${props.wallet?.funder}/transfer`, data)

    if (response.walletActivating) {
      // Wallet needs activation, transfer will be processed after
      walletActivating.value = true
      activatingFunder.value = response.funder ?? null
    } else if (response.transactionHash) {
      // Direct transfer success
      transactionHash.value = response.transactionHash
    }
    toast.success(TC('messages.submitSuccess'))
    emit('success')
  } catch (err) {
    console.error('Failed to transfer:', err)
  } finally {
    loading.value = false
  }
}

// Reset form when modal closes
watch(visible, value => {
  if (!value) {
    resetToDefault()
    formState.toAddress = undefined
    transactionHash.value = null
    walletActivating.value = false
    activatingFunder.value = null
  }
})

// Wallet filters to exclude source wallet from target selection
const walletFilters = computed(() => {
  if (!props.wallet?.funder) return undefined
  return {
    funders: [ props.wallet.funder ],
    exclude: true,
  }
})
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
      :successMessage="T('submitted')"
      :activatingMessage="T('walletActivating')"
    />

    <!-- Form state -->
    <div
      v-else
      class="flex flex-col gap-4"
    >
      <!-- From wallet (display only) -->
      <div class="flex flex-col gap-1">
        <FormLabel>{{ T('fromWallet') }}</FormLabel>
        <div
          class="
            flex h-10 items-center gap-2 rounded-md border border-surface px-3
            bg-emphasis
          "
        >
          <span class="truncate font-medium">
            {{ wallet?.name }}
          </span>
          <span class="shrink-0 text-muted-color">
            ({{ formatCurrency(balanceNum) }})
          </span>
        </div>
      </div>

      <!-- To wallet select -->
      <div class="flex flex-col gap-1">
        <FormLabel>{{ T('toWallet') }}</FormLabel>
        <AppWalletSelect
          v-model="formState.toAddress"
          :walletFilters="walletFilters"
        />
        <p class="text-sm text-muted-color">
          {{ T('toWalletHint') }}
        </p>
      </div>

      <!-- Amount -->
      <div class="flex flex-col gap-1">
        <FormLabel htmlFor="transfer-amount">
          {{ TC('labels.amount') }}
        </FormLabel>
        <InputGroup>
          <InputNumber
            id="transfer-amount"
            v-model="formState.amount"
            name="amount"
            :showButtons="false"
            :minFractionDigits="0"
            :maxFractionDigits="2"
            :min="0"
            :placeholder="TW('placeholders.amount')"
            :invalid="!!validationResult.amount || amountExceedsBalance"
            @update:modelValue="validateField('amount')"
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

      <!-- Balance display -->
      <div class="flex items-center justify-between text-sm">
        <span class="text-muted-color">
          {{ TW('labels.availableBalance') }}
        </span>
        <span class="flex items-center gap-1 font-medium">
          {{ formatCurrency(balanceNum) }}
          <IconUSDC :size="14" />
        </span>
      </div>

      <!-- Info message -->
      <Message severity="info">
        {{ T('info') }}
      </Message>
    </div>
  </Modal>
</template>
