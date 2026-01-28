<script setup lang="ts">
import type { HasBotsErrorDetails } from '~/components/app/HasBotsErrorMessage/index.vue'
import HasBotsErrorMessage from '~/components/app/HasBotsErrorMessage/index.vue'

interface Wallet {
  funder: string
  name: string
  createdAt: string
}

export interface DeleteModalProps {
  visible: boolean
  wallet: Wallet | null
}

const props = defineProps<DeleteModalProps>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'success': []
}>()

const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const T = useTranslations('pages.app.wallets.components.DeleteModal')
const TC = useTranslations('common')
const request = useRequest()
const toast = useToast()

const loading = ref(false)

async function handleDelete () {
  if (!props.wallet) return

  loading.value = true

  try {
    await request.delete(`/api/wallets/${props.wallet.funder}`, {
      customErrorMessage: error => {
        const errorData = error.data?.data as { code?: string, details?: HasBotsErrorDetails } | undefined
        if (errorData?.code === 'WALLET_HAS_BOTS' && errorData?.details) {
          return h(HasBotsErrorMessage, { details: errorData.details })
        }
      },
    })
    toast.success(TC('messages.deleteSuccess'))
    visible.value = false
    emit('success')
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ConfirmDeleteModal
    :visible="visible"
    :title="T('title')"
    :message="T('warning')"
    :loading="loading"
    @cancel="visible = false"
    @confirm="handleDelete"
  >
    <div class="space-y-3">
      <p class="text-muted-color">
        {{ T('message', { name: wallet?.name }) }}
      </p>

      <Message severity="warn">
        {{ T('backupReminder') }}
      </Message>
    </div>
  </ConfirmDeleteModal>
</template>
