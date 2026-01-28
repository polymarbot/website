<script setup lang="ts">
interface Wallet {
  funder: string
  name: string
  createdAt: string
}

const props = defineProps<{
  wallet: Wallet | null
}>()

const T = useTranslations('pages.app.wallets.components.ExportModal')
const TC = useTranslations('common')
const request = useRequest()
const toast = useToast()

const loading = ref(false)
const privateKey = ref('')
const showKey = ref(false)

// Fetch private key when component mounts
onMounted(async () => {
  if (!props.wallet) return

  loading.value = true
  privateKey.value = ''
  showKey.value = false

  try {
    // Generate client-side key pair for secure transfer
    const { publicKey, privateKey: clientPrivateKey } = await generateClientKeyPair()

    // Request encrypted private key from server
    const response = await request.get<{ encryptedPrivateKey: string }>(
      `/api/wallets/${props.wallet.funder}/export`,
      { query: { publicKey }},
    )

    // Decrypt the private key using client's private key
    try {
      privateKey.value = await decryptWithClientKey(clientPrivateKey, response.encryptedPrivateKey)
    } catch (decryptErr) {
      console.error('RSA decryption failed:', decryptErr)
      toast.error(T('decryptFailed'))
    }
  } catch (err) {
    console.error('Failed to export wallet:', err)
  } finally {
    loading.value = false
  }
})

</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-if="loading"
      class="flex items-center justify-center py-8"
    >
      <Loading />
    </div>

    <template v-else-if="privateKey">
      <Message severity="warn">
        {{ T('copyWarning') }}
      </Message>

      <div class="flex flex-col gap-1">
        <FormLabel>
          {{ TC('labels.privateKey') }}
        </FormLabel>
        <div class="rounded-border border border-surface p-3">
          <span
            class="font-mono text-sm break-all transition-all duration-200"
            :class="{ 'blur-xs': !showKey }"
          >
            {{ privateKey }}
          </span>
        </div>
        <div class="mt-1 flex justify-end gap-2">
          <Button
            severity="secondary"
            :icon="showKey ? 'pi pi-eye-slash' : 'pi pi-eye'"
            outlined
            @click="showKey = !showKey"
          />
          <CopyButton
            severity="secondary"
            outlined
            :copy="privateKey"
          />
        </div>
      </div>
    </template>
  </div>
</template>
