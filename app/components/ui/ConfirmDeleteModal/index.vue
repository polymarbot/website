<script setup lang="ts">
import type { ModalProps } from '../Modal.vue'

export interface ConfirmDeleteModalProps
  extends /* @vue-ignore */ Omit<ModalProps, 'confirmSeverity'> {
  visible: boolean
  message?: string
}

const props = defineProps<ConfirmDeleteModalProps>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const visible = computed({
  get: () => props.visible,
  set: value => emit('update:visible', value),
})

const T = useTranslations('components.ui.ConfirmDeleteModal')

const inputValue = ref('')

// Confirmation text from i18n
const confirmationText = computed(() => T('confirmationText'))

const isConfirmationValid = computed(
  () => inputValue.value.toUpperCase() === confirmationText.value.toUpperCase(),
)

const resolvedTitle = computed(() => props.title ?? T('title'))
const resolvedConfirmText = computed(() => props.confirmText ?? T('confirm'))
const resolvedMessage = computed(() => props.message ?? T('defaultMessage'))

// Reset input value when modal is closed
watch(visible, value => {
  if (value) {
    inputValue.value = ''
  }
})
</script>

<template>
  <Modal
    :visible="visible"
    :title="resolvedTitle"
    :confirmText="resolvedConfirmText"
    :confirmDisabled="!isConfirmationValid"
    confirmSeverity="danger"
    showCancel
    @cancel="visible = false"
  >
    <!-- Custom content slot -->
    <div class="flex flex-col gap-4">
      <slot />

      <!-- Warning message -->
      <Message severity="error">
        {{ resolvedMessage }}
      </Message>

      <!-- Confirmation input -->
      <div class="flex flex-col gap-1">
        <FormLabel>
          <i18n-t keypath="components.ui.ConfirmDeleteModal.inputLabel">
            <Tag severity="danger">
              {{ confirmationText }}
            </Tag>
          </i18n-t>
        </FormLabel>
        <Input
          v-model="inputValue"
          :placeholder="confirmationText"
          :invalid="inputValue.length > 0 && !isConfirmationValid"
        />
      </div>
    </div>
  </Modal>
</template>
