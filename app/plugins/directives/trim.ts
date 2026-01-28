import type { Directive, DirectiveBinding } from 'vue'

/**
 * v-trim directive
 *
 * Automatically trims whitespace from input values on blur event.
 * Works with both native input elements and PrimeVue components.
 *
 * Usage:
 *   <InputText v-model="value" v-trim />
 *   <input v-model="value" v-trim />
 */

interface TrimableElement extends HTMLElement {
  _trimBlurHandler?: () => void
}

export const vTrim: Directive = {
  mounted (el: TrimableElement, _binding: DirectiveBinding) {
    // Find the actual input element (for component libraries, input may be nested)
    const input = (
      el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'
        ? el
        : el.querySelector('input, textarea')
    ) as HTMLInputElement | HTMLTextAreaElement | null

    if (!input) return

    const handleBlur = () => {
      const originalValue = input.value
      const trimmedValue = originalValue.trim()

      if (originalValue !== trimmedValue) {
        input.value = trimmedValue

        // Trigger input event to update v-model binding
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }

    input.addEventListener('blur', handleBlur)

    // Store handler reference for cleanup
    ;(input as TrimableElement)._trimBlurHandler = handleBlur
  },

  unmounted (el: TrimableElement) {
    const input = (
      el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'
        ? el
        : el.querySelector('input, textarea')
    ) as TrimableElement | null

    if (input && input._trimBlurHandler) {
      input.removeEventListener('blur', input._trimBlurHandler)
      delete input._trimBlurHandler
    }
  },
}
