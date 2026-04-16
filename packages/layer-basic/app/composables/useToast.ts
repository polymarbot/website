import type { ToastMessageOptions } from 'primevue/toast'
import { useToast as usePrimeToast } from 'primevue/usetoast'

/**
 * Toast utility composable
 *
 * Provides convenient methods for showing different types of toast messages.
 * Maps to PrimeVue's toast severity system.
 *
 * IMPORTANT: Must be called within Vue component setup context.
 */
export function useToast () {
  const primeToast = usePrimeToast()

  return {
    success: (detail: string, summary?: string) =>
      primeToast.add({
        detail,
        summary,
        severity: 'success',
        life: 5000,
      }),

    error: (detail: string, summary?: string) =>
      primeToast.add({
        detail,
        summary,
        severity: 'error',
        life: 5000,
      }),

    warn: (detail: string, summary?: string) =>
      primeToast.add({
        detail,
        summary,
        severity: 'warn',
        life: 5000,
      }),

    info: (detail: string, summary?: string) =>
      primeToast.add({
        detail,
        summary,
        severity: 'info',
        life: 5000,
      }),

    // Generic method, directly uses PrimeVue's toast.add function
    custom: (options: ToastMessageOptions) => primeToast.add(options),

    // Close methods
    close: (message: ToastMessageOptions) => primeToast.remove(message),
    closeAll: () => primeToast.removeAllGroups(),
  }
}
