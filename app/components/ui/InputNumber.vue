<script setup lang="ts">
import type { InputNumberProps as BaseInputNumberProps } from 'primevue/inputnumber'

export interface InputNumberProps extends /* @vue-ignore */ Omit<BaseInputNumberProps, 'modelValue'> {
  // Non-passthrough prop: only used internally
  /** Enable password manager autofill (1Password, etc.). Disabled by default. */
  autofill?: boolean
}

defineProps<InputNumberProps>()
</script>

<template>
  <PrimeInputNumber
    showButtons
    :data-1p-ignore="autofill ? undefined : true"
    :autocomplete="autofill ? undefined : 'off'"
  >
    <template
      v-for="name in Object.keys($slots)"
      :key="name"
      #[name]="slotData"
    >
      <slot
        :name="name"
        v-bind="slotData ?? {}"
      />
    </template>
  </PrimeInputNumber>
</template>
