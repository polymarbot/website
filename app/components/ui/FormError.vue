<script setup lang="ts">
/**
 * FormError - Display validation error message for form fields
 *
 * Works with useForm composable's validationResult.
 */

import type { ValidationResult } from '~/composables/useForm'

const props = defineProps<{
  /** Field name to display error for */
  name: string
  /** Validation result from useForm */
  errors?: ValidationResult
}>()

const errorMessage = computed(() => props.errors?.[props.name])
</script>

<template>
  <PrimeMessage
    v-if="errorMessage"
    severity="error"
    size="small"
    variant="simple"
    :data-form-error="name"
  >
    {{ errorMessage }}
  </PrimeMessage>
</template>
