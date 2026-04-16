<script setup lang="ts">
useDarkMode()
useSeoHead()

const { isMobile } = useDevice()
const toastPosition = computed(() => (isMobile.value ? 'top-center' : 'bottom-right'))
</script>

<template>
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
