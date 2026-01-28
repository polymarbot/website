<script setup lang="ts">
import ExportPrivateKeyDisplay from './ExportPrivateKeyDisplay.vue'

interface Wallet {
  funder: string
  name: string
  createdAt: string
}

export interface ExportModalProps {
  visible: boolean
  wallet: Wallet | null
}

const props = defineProps<ExportModalProps>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const ns = 'pages.app.wallets.components.ExportModal'
const T = useTranslations(ns)

const confirmed = ref(false)
const displayDialogVisible = ref(false)

// Reset checkbox when confirm dialog opens
watch(visible, value => {
  if (value) {
    confirmed.value = false
  }
})

function handleConfirm () {
  displayDialogVisible.value = true
}
</script>

<template>
  <div>
    <!-- Step 1: Confirmation Modal -->
    <Modal
      v-model:visible="visible"
      :title="T('title')"
      showClose
      :confirmDisabled="!confirmed"
      @confirm="handleConfirm"
    >
      <div class="flex flex-col gap-4">
        <Message severity="info">
          <i18n-t :keypath="`${ns}.funderNotice`">
            <template #connectToPolymarket>
              <WebLink
                href="https://docs.polymarket.com/polymarket-learn/get-started/how-to-signup#crypto-wallet-sign-up"
                target="_blank"
              >
                {{ T('connectToPolymarket') }}
              </WebLink>
            </template>
            <template #withdraw>
              <WebLink
                href="https://docs.polymarket.com/polymarket-learn/deposits/how-to-withdraw"
                target="_blank"
              >
                {{ T('withdraw') }}
              </WebLink>
            </template>
          </i18n-t>
        </Message>

        <Message severity="warn">
          {{ T('warningDetail') }}
        </Message>

        <label class="flex cursor-pointer items-center gap-2">
          <Checkbox
            v-model="confirmed"
            binary
          />
          <span class="text-sm text-muted-color">
            {{ T('confirmCheckbox') }}
          </span>
        </label>
      </div>
    </Modal>

    <!-- Step 2: Display Private Key Modal -->
    <Modal
      v-model:visible="displayDialogVisible"
      :title="T('title')"
      showClose
      hideFooter
    >
      <ExportPrivateKeyDisplay :wallet="wallet" />
    </Modal>
  </div>
</template>
