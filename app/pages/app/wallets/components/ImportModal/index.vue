<script setup lang="ts">
export interface ImportModalProps {
  visible: boolean
}

const props = defineProps<ImportModalProps>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'success': []
}>()

const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const T = useTranslations('pages.app.wallets.components.ImportModal')
const TW = useTranslations('pages.app.wallets')
const TC = useTranslations('common')
const request = useRequest()
const toast = useToast()

const loading = ref(false)

const formState = reactive({
  name: '',
  privateKey: '',
})

// Create schema from shared validation
const schema = createApiValidationSchema('POST', '/api/wallets/import')

// Use form composable with manual validation on change
const { validate, validateField, resetToDefault, validationResult, changed } = useForm(formState, {
  schema,
  autoValidate: false,
})

// Handle confirm button click
async function handleConfirm () {
  loading.value = true

  try {
    const data = await validate()

    // Get server's public key for encryption
    const { publicKey: serverPublicKey } = await request.get<{ publicKey: string }>('/api/crypto/public-key')

    // Encrypt the private key before sending
    let encryptedPrivateKey: string
    try {
      encryptedPrivateKey = await encryptWithServerKey(serverPublicKey, data.privateKey as string)
    } catch (encryptErr) {
      console.error('RSA encryption failed:', encryptErr)
      toast.error(T('encryptFailed'))
      return
    }

    // Send encrypted data to server
    await request.post('/api/wallets/import', {
      name: data.name,
      encryptedPrivateKey,
    })

    toast.success(TC('messages.importSuccess'))
    visible.value = false
    emit('success')
  } catch (err) {
    console.error('Failed to import wallet:', err)
  } finally {
    loading.value = false
  }
}

// Reset form when modal closes
watch(visible, value => {
  if (!value) {
    resetToDefault()
  }
})

function onPasted (pastedText: string) {
  formState.privateKey = pastedText
  validateField('privateKey')
}
</script>

<template>
  <Modal
    :visible="visible"
    :title="T('title')"
    :loading="loading"
    :confirmDisabled="!changed"
    showCancel
    @cancel="visible = false"
    @confirm="handleConfirm"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <FormLabel htmlFor="import-wallet-name">
          {{ TW('labels.walletName') }}
        </FormLabel>
        <Input
          id="import-wallet-name"
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
      <div class="flex flex-col gap-1">
        <FormLabel htmlFor="import-private-key">
          {{ TC('labels.privateKey') }}
        </FormLabel>
        <InputGroup>
          <Input
            id="import-private-key"
            v-model="formState.privateKey"
            name="privateKey"
            type="password"
            :placeholder="T('privateKeyPlaceholder')"
            :invalid="!!validationResult.privateKey"
            @change="validateField('privateKey')"
          />
          <template #append>
            <PasteButton
              severity="secondary"
              @pasted="onPasted"
            />
          </template>
        </InputGroup>
        <FormError
          name="privateKey"
          :errors="validationResult"
        />
      </div>
      <p class="text-sm text-muted-color">
        {{ T('description') }}
      </p>
      <Message severity="warn">
        <p>
          {{ T('warning.description') }}
        </p>
        <p class="mt-2">
          <WebLink href="https://docs.polymarket.com/developers/market-makers/setup#safe-wallet-recommended">
            {{ T('warning.learnMore') }}
          </WebLink>
        </p>
      </Message>
    </div>
  </Modal>
</template>
