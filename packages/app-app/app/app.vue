<script setup lang="ts">
const runtimeConfig = useRuntimeConfig()

useDarkMode()
useSeoHead()

const { isMobile } = useDevice()
const toastPosition = computed(() => (isMobile.value ? 'top-center' : 'bottom-right'))
const nonProdPosition = computed(() => (isMobile.value ? 'top-right' : 'top-left'))
</script>

<template>
  <EffectNonProd
    :dev="runtimeConfig.public.isDev"
    :stg="runtimeConfig.public.isStg"
    :position="nonProdPosition"
  />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <PrimeToast :position="toastPosition" />
  <PrimeConfirmDialog :closable="false">
    <template #message="{ message }">
      <ModalContent
        :icon="message.icon"
        :content="message.message"
      />
    </template>
  </PrimeConfirmDialog>
</template>
