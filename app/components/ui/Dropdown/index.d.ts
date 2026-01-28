import type { VNode } from 'vue'

declare module 'primevue/dropdown' {
  export interface DropdownSlots {
    /**
     * Custom popup content slot
     * @param {Object} scope - popup slot's params
     */
    popup(scope: {
      /**
       * Function to hide the popup
       */
      hide: () => void
    }): VNode[]
  }
}
