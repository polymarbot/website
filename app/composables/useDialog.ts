import type { ConfirmationOptions } from 'primevue/confirmationoptions'
import type { VNode } from 'vue'
import { useConfirm } from 'primevue/useconfirm'

type DialogType = 'info' | 'success' | 'warn' | 'danger'

// Custom message content type: string, VNode, or HTMLElement
export type DialogMessageContent = string | VNode | HTMLElement

interface DialogOptions extends Omit<ConfirmationOptions, 'accept' | 'reject' | 'message'> {
  type?: DialogType
  message?: DialogMessageContent
}

const iconColorMap: Record<DialogType, string> = {
  info: '!text-info',
  success: '!text-success',
  warn: '!text-warn',
  danger: '!text-danger',
}

/**
 * Dialog utility composable
 *
 * Provides convenient methods for showing confirmation dialogs.
 * Built on top of PrimeVue's ConfirmationService.
 *
 * IMPORTANT: Must be called within Vue component setup context.
 */
export function useDialog () {
  const primeConfirm = useConfirm()
  const { t } = useI18n()

  /**
   * Show a confirmation dialog
   * Returns a Promise that resolves to true if accepted, false if rejected
   */
  const confirm = (options: DialogOptions): Promise<boolean> => {
    const type = options.type ?? 'info'
    const iconColor = iconColorMap[type]
    return new Promise(resolve => {
      primeConfirm.require({
        header: options.header ?? t('common.labels.confirmation'),
        icon: options.icon ?? `pi pi-question-circle ${iconColor}`,
        acceptLabel: options.acceptLabel ?? t('common.actions.confirm'),
        rejectLabel: options.rejectLabel ?? t('common.actions.cancel'),
        acceptProps: { severity: 'primary', ...options.acceptProps },
        rejectProps: { severity: 'secondary', ...options.rejectProps },
        acceptClass: 'min-w-[8rem]',
        rejectClass: 'min-w-[8rem]',
        ...options,
        accept: () => resolve(true),
        reject: () => resolve(false),
      } as ConfirmationOptions)
    })
  }

  /**
   * Show an alert dialog (info message with single OK button)
   * Returns a Promise that resolves when the dialog is closed
   */
  const alert = (options: DialogOptions): Promise<void> => {
    const type = options.type ?? 'info'
    const iconColor = iconColorMap[type]
    return new Promise(resolve => {
      primeConfirm.require({
        header: options.header ?? t('common.labels.alert'),
        icon: options.icon ?? `pi pi-info-circle ${iconColor}`,
        acceptLabel: options.acceptLabel ?? t('common.actions.ok'),
        acceptProps: { severity: 'primary', ...options.acceptProps },
        acceptClass: 'min-w-[12rem]',
        rejectClass: '!hidden',
        ...options,
        accept: () => resolve(),
        reject: () => resolve(),
      } as ConfirmationOptions)
    })
  }

  /**
   * Show a delete confirmation dialog (danger styled)
   * Returns a Promise that resolves to true if accepted, false if rejected
   */
  const destroy = (options: DialogOptions): Promise<boolean> => {
    const type = options.type ?? 'warn'
    const iconColor = iconColorMap[type]
    return new Promise(resolve => {
      primeConfirm.require({
        header: options.header ?? t('common.labels.deleteConfirmation'),
        icon: options.icon ?? `pi pi-exclamation-triangle ${iconColor}`,
        acceptLabel: options.acceptLabel ?? t('common.actions.delete'),
        rejectLabel: options.rejectLabel ?? t('common.actions.cancel'),
        acceptProps: { severity: 'danger', ...options.acceptProps },
        rejectProps: { severity: 'secondary', ...options.rejectProps },
        acceptClass: 'min-w-[8rem]',
        rejectClass: 'min-w-[8rem]',
        ...options,
        accept: () => resolve(true),
        reject: () => resolve(false),
      } as ConfirmationOptions)
    })
  }

  return {
    confirm,
    alert,
    destroy,
    // Close method for manual control
    close: () => primeConfirm.close(),
  }
}
