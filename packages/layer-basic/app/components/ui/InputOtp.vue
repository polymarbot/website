<script setup lang="ts">
import type { InputOtpProps as BaseInputOtpProps } from 'primevue/inputotp'

export interface InputOtpProps extends /* @vue-ignore */ BaseInputOtpProps {}

defineProps<InputOtpProps>()
</script>

<template>
  <PrimeInputOtp />
</template>
