<script setup lang="ts">
const route = useRoute()
const funder = route.params.funder as string

navigateTo(`/wallets/${funder}/transactions`, { replace: true })
</script>

<template>
  <div />
</template>
