<script setup lang="ts">
import type { DialogProps } from 'primevue/dialog'
import type { ButtonProps } from 'primevue/button'

export interface ModalProps extends /* @vue-ignore */ Omit<DialogProps, 'header' | 'closable' | 'showHeader'> {
  visible?: boolean
  loading?: boolean
  disabled?: boolean
  confirmDisabled?: boolean
  showCancel?: boolean
  showClose?: boolean
  hideHeader?: boolean
  hideFooter?: boolean
  alignCenter?: boolean
  title?: string
  confirmText?: string
  cancelText?: string
  confirmSeverity?: ButtonProps['severity']
  cancelSeverity?: ButtonProps['severity']
}

const props = withDefaults(defineProps<ModalProps>(), {
  title: undefined,
  confirmText: undefined,
  cancelText: undefined,
  confirmSeverity: 'primary',
  cancelSeverity: 'secondary',
})

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'open': []
  'close': []
  'confirm': []
  'cancel': []
}>()

const { t } = useI18n()

// Resolve button text with i18n fallback
const resolvedConfirmText = computed(
  () => props.confirmText ?? t('common.actions.confirm'),
)
const resolvedCancelText = computed(
  () => props.cancelText ?? t('common.actions.cancel'),
)

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => {
    // Close button clicked or ESC key pressed
    if (
      !value
      && props.visible
      && !props.loading
    ) {
      onCancel()
    }
  },
})

watch(() => props.visible, visible => {
  if (visible) emit('open')
  else emit('close')
})

function onConfirm () {
  emit('confirm')
  emit('update:visible', false)
}

function onCancel () {
  emit('cancel')
  emit('update:visible', false)
}
</script>

<template>
  <PrimeDialog
    v-model:visible="dialogVisible"
    :header="title"
    :showHeader="!hideHeader"
    :closable="showClose"
    modal
    :pt="{
      root: {
        class: alignCenter ? 'text-center' : undefined,
      },
      title: {
        class: alignCenter ? 'w-full' : undefined,
      },
      header: {
        class: 'pb-0',
      },
      content: {
        class: [
          'pt-5',
          loading || disabled ? 'pointer-events-none opacity-50' : undefined,
        ],
        style: `-webkit-mask-image: -webkit-linear-gradient(top, transparent 0, #000 1.25rem, #000 calc(100% - 1.25rem), transparent 100%);`,
      },
      footer: {
        class: alignCenter ? 'justify-center' : undefined,
      },
    }"
  >
    <template
      v-if="!hideHeader && (!!title || !!$slots.header)"
      #header
    >
      <slot name="header">
        <span class="p-dialog-title">
          {{ title }}
        </span>
      </slot>
    </template>

    <slot />

    <template
      v-if="!hideFooter"
      #footer
    >
      <slot name="footer">
        <div class="flex w-full items-center justify-between gap-4">
          <!-- Left side slot -->
          <div class="min-w-0 flex-1">
            <slot name="footerLeft" />
          </div>

          <!-- Right side buttons -->
          <div
            class="flex shrink-0 gap-2"
            :class="[ alignCenter ? 'justify-center' : 'justify-end' ]"
          >
            <Button
              v-if="showCancel"
              class="min-w-[8rem]"
              :severity="cancelSeverity"
              :disabled="loading"
              @click="onCancel"
            >
              {{ resolvedCancelText }}
            </Button>
            <Button
              :class="showCancel ? 'min-w-[8rem]' : 'min-w-[12rem]'"
              :severity="confirmSeverity"
              :loading="loading"
              :disabled="disabled || confirmDisabled"
              @click="onConfirm"
            >
              {{ resolvedConfirmText }}
            </Button>
          </div>
        </div>
      </slot>
    </template>
  </PrimeDialog>
</template>
