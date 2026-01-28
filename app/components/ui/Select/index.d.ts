import type { VNode } from 'vue'
import type { SelectOption } from './index.vue'

declare module 'primevue/select' {
  /**
   * Extended SelectSlots to include option data in value slot
   * This extends the default PrimeVue Select component's value slot
   * to include the full option object
   */
  export interface SelectSlots {
    /**
     * Custom value template with extended option data
     * @param {Object} scope - value slot's params
     */
    value(scope: {
      /**
       * Value of the component
       */
      value: any
      /**
       * Placeholder prop value
       */
      placeholder: string
      /**
       * Full option object (extended by our Select wrapper)
       * Returns null when the option is not found in the options array
       */
      option: SelectOption | null
    }): VNode[]
  }
}

declare module 'primevue/multiselect' {
  /**
   * Extended MultiSelectSlots to include option data in value and chip slots
   * This extends the default PrimeVue MultiSelect component's slots
   */
  export interface MultiSelectSlots {
    /**
     * Custom value template with extended options data (non-chip mode)
     * @param {Object} scope - value slot's params
     */
    value(scope: {
      /**
       * Array of selected values
       */
      value: any[]
      /**
       * Placeholder prop value
       */
      placeholder: string
      /**
       * Full option objects array (extended by our Select wrapper)
       */
      options: SelectOption[]
    }): VNode[]

    /**
     * Custom chip template with extended option data (chip mode)
     * In chip mode, value slot is used as chip slot content
     * @param {Object} scope - chip slot's params
     */
    chip(scope: {
      /**
       * Single value of the chip
       */
      value: any
      /**
       * Full option object (extended by our Select wrapper)
       */
      option: SelectOption | null
      /**
       * Callback to remove the chip
       */
      removeCallback: (event: Event, value: any) => void
    }): VNode[]
  }
}
