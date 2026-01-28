<script setup lang="ts">
const route = useRoute()
const funder = route.params.funder as string

navigateTo(`/app/wallets/${funder}/transactions`, { replace: true })
</script>

<template>
  <div></div>
</template>
