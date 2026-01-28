<script setup lang="ts">
import type { HasBotsErrorDetails } from '~/components/app/HasBotsErrorMessage/index.vue'
import HasBotsErrorMessage from '~/components/app/HasBotsErrorMessage/index.vue'

interface Strategy {
  id: string
  name: string
}

export interface DeleteModalProps {
  visible: boolean
  strategy: Strategy
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

const T = useTranslations('pages.app.strategies')
const TC = useTranslations('common')
const request = useRequest()
const toast = useToast()

const loading = ref(false)

async function handleDelete () {
  loading.value = true

  try {
    await request.delete(`/api/strategies/${props.strategy.id}`, {
      customErrorMessage: error => {
        const errorData = error.data?.data as { code?: string, details?: HasBotsErrorDetails } | undefined
        if (errorData?.code === 'STRATEGY_HAS_BOTS' && errorData?.details) {
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
  <Modal
    :visible="visible"
    :title="T('modals.delete.title')"
    :loading="loading"
    :confirmText="TC('actions.delete')"
    confirmSeverity="danger"
    showCancel
    @cancel="visible = false"
    @confirm="handleDelete"
  >
    <p class="text-muted-color">
      {{ T('modals.delete.message', { name: strategy.name }) }}
    </p>
  </Modal>
</template>
