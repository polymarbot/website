<script setup lang="ts">
interface Wallet {
  funder: string
  name: string
}

export interface DetailModalProps {
  visible: boolean
  wallet?: Wallet | null
}

const props = defineProps<DetailModalProps>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'success': []
}>()

const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const T = useTranslations('pages.app.wallets.components.DetailModal')
const TW = useTranslations('pages.app.wallets')
const TC = useTranslations('common')
const request = useRequest()
const toast = useToast()

const loading = ref(false)

// Determine mode based on wallet prop
const isEditMode = computed(() => !!props.wallet)

// Form state (flat object)
const formState = reactive({
  name: '',
})

// Create schema based on mode
const schema = computed(() => {
  if (isEditMode.value) {
    return createApiValidationSchema('PATCH', '/api/wallets/[funder]')
  }
  return createApiValidationSchema('POST', '/api/wallets')
})

// Use form composable with manual validation on change
const { origin, validate, validateField, reset, validationResult, changed } = useForm(formState, {
  schema,
  autoValidate: false,
})

// Watch wallet prop changes to update origin
watch(() => props.wallet, wallet => {
  if (wallet) {
    origin.value = { name: wallet.name }
  } else {
    origin.value = { name: '' }
  }
}, { immediate: true })

// Reset form when modal opens
watch(visible, value => {
  if (value) {
    reset()
  }
})

// Handle confirm button click
async function handleConfirm () {
  loading.value = true

  try {
    const data = await validate()

    if (isEditMode.value && props.wallet) {
      await request.patch(`/api/wallets/${props.wallet.funder}`, data)
      toast.success(TC('messages.updateSuccess'))
    } else {
      await request.post('/api/wallets', data)
      toast.success(TC('messages.createSuccess'))
    }
    visible.value = false
    emit('success')
  } catch (err) {
    console.error('Failed to save wallet:', err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Modal
    :visible="visible"
    :title="isEditMode ? T('edit.title') : T('create.title')"
    :loading="loading"
    :confirmDisabled="!changed"
    showCancel
    @cancel="visible = false"
    @confirm="handleConfirm"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <FormLabel htmlFor="wallet-name">
          {{ TW('labels.walletName') }}
        </FormLabel>
        <Input
          id="wallet-name"
          v-model="formState.name"
          v-trim
          name="name"
          :placeholder="TW('placeholders.walletName')"
          :invalid="!!validationResult.name"
          @change="validateField('name')"
        />
        <FormError
          name="name"
          :errors="validationResult"
        />
      </div>
      <p
        v-if="!isEditMode"
        class="text-sm text-muted-color"
      >
        {{ T('create.description') }}
      </p>
    </div>
  </Modal>
</template>
