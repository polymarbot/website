<script setup lang="ts">
interface Wallet {
  funder: string
  name: string
  balance: string
}

export interface WithdrawModalProps {
  visible: boolean
  wallet: Wallet | null
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

const T = useTranslations('pages.app.wallets.components.WithdrawModal')
const TW = useTranslations('pages.app.wallets')
const TC = useTranslations('common')
const request = useRequest()
const toast = useToast()

const loading = ref(false)
const transactionHash = ref<string | null>(null)
const walletActivating = ref(false)
const activatingFunder = ref<string | null>(null)

const formState = reactive({
  toAddress: '',
  amount: 0,
})

// Create schema from shared validation
const schema = createApiValidationSchema('POST', '/api/wallets/[funder]/withdraw')

// Use form composable with manual validation on change
const { validate, validateField, resetToDefault, validationResult } = useForm(formState, {
  schema,
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
    }>(
      `/api/wallets/${props.wallet?.funder}/withdraw`,
      {
        toAddress: data.toAddress,
        amount: data.amount,
      },
    )

    if (response.walletActivating) {
      // Wallet needs activation, withdrawal will be processed after
      walletActivating.value = true
      activatingFunder.value = response.funder ?? null
      toast.success(TC('messages.submitSuccess'))
      emit('success')
    } else if (response.transactionHash) {
      // Direct withdrawal success
      transactionHash.value = response.transactionHash
      toast.success(TC('messages.submitSuccess'))
      emit('success')
    }
  } catch (err) {
    console.error('Failed to withdraw:', err)
  } finally {
    loading.value = false
  }
}

// Reset form when modal closes
watch(visible, value => {
  if (!value) {
    resetToDefault()
    transactionHash.value = null
    walletActivating.value = false
    activatingFunder.value = null
  }
})

// PolygonScan URL for transaction
const polygonScanUrl = computed(() => {
  if (!transactionHash.value) return ''
  return `https://polygonscan.com/tx/${transactionHash.value}`
})

// PolygonScan URL for funder address (to check wallet deployment)
const funderPolygonScanUrl = computed(() => {
  if (!activatingFunder.value) return ''
  return `https://polygonscan.com/address/${activatingFunder.value}`
})

// Handle paste address
function onAddressPasted (pastedText: string) {
  formState.toAddress = pastedText
  validateField('toAddress')
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
    <!-- Success state: show transaction hash -->
    <div
      v-if="transactionHash"
      class="flex flex-col gap-4"
    >
      <Message severity="success">
        {{ T('submitted') }}
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
        <IconPolygon :size="20" />
        <span>{{ TW('labels.viewOnPolygonscan') }}</span>
      </WebLink>
    </div>

    <!-- Wallet activating state -->
    <div
      v-else-if="walletActivating"
      class="flex flex-col gap-4"
    >
      <Message severity="info">
        {{ T('walletActivating') }}
      </Message>

      <WebLink
        :href="funderPolygonScanUrl"
        class="flex items-center justify-center gap-2"
      >
        <IconPolygon :size="20" />
        <span>{{ TW('labels.viewWalletOnPolygonscan') }}</span>
      </WebLink>
    </div>

    <!-- Form state -->
    <div
      v-else
      class="flex flex-col gap-4"
    >
      <!-- Token and Chain (fixed, display only) -->
      <div>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-1">
            <FormLabel>{{ TC('labels.token') }}</FormLabel>
            <div
              class="
                flex h-10 items-center gap-2 rounded-md border border-surface
                px-3 bg-emphasis
              "
            >
              <IconUSDC :size="20" />
              <span class="font-medium">
                USDC.e
              </span>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <FormLabel>{{ TC('labels.chain') }}</FormLabel>
            <div
              class="
                flex h-10 items-center gap-2 rounded-md border border-surface
                px-3 bg-emphasis
              "
            >
              <IconPolygon :size="20" />
              <span class="font-medium">
                Polygon
              </span>
            </div>
          </div>
        </div>

        <div class="mt-1 truncate">
          <WebLink
            :href="`https://polygonscan.com/token/${USDC_ADDRESS}`"
            class="
              text-sm text-muted-color
              hover:text-primary
            "
          >
            {{ USDC_ADDRESS }}
          </WebLink>
        </div>
      </div>

      <!-- Recipient Address -->
      <div class="flex flex-col gap-1">
        <FormLabel htmlFor="withdraw-to-address">
          {{ T('recipientAddress') }}
        </FormLabel>
        <InputGroup>
          <Textarea
            id="withdraw-to-address"
            v-model="formState.toAddress"
            v-trim
            name="toAddress"
            :placeholder="T('recipientPlaceholder')"
            :invalid="!!validationResult.toAddress"
            @change="validateField('toAddress')"
          />
          <template #append>
            <PasteButton
              severity="secondary"
              @pasted="onAddressPasted"
            />
          </template>
        </InputGroup>
        <FormError
          name="toAddress"
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
