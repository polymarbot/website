<script setup lang="ts">
const T = useTranslations('pages.wallets.components.BridgeAssetSelector')

export interface BridgeAssetSelectorProps {
  tokenSymbol: string
  chainName: string
  tokens: { symbol: string }[]
  chains: BridgeSupportedChain[]
}

const props = defineProps<BridgeAssetSelectorProps>()

const emit = defineEmits<{
  'update:tokenSymbol': [value: string]
  'update:chainName': [value: string]
}>()

const tokenModel = computed({
  get: () => props.tokenSymbol,
  set: value => emit('update:tokenSymbol', value),
})

const chainModel = computed({
  get: () => props.chainName,
  set: value => emit('update:chainName', value),
})
</script>

<template>
  <div>
    <div class="grid grid-cols-2 gap-4">
      <!-- Token -->
      <div class="flex flex-col gap-1">
        <FormLabel>{{ T('token') }}</FormLabel>
        <Select
          v-model="tokenModel"
          :options="tokens.map(t => ({ label: t.symbol, value: t.symbol }))"
        >
          <template #value="{ option }">
            <div
              v-if="option"
              class="flex items-center gap-2"
            >
              <img
                :src="getTokenIcon(option.value)"
                :width="18"
                :height="18"
                :alt="option.label"
                style="max-width: none;"
              >
              <span>{{ option.label }}</span>
            </div>
          </template>
          <template #option="{ option }">
            <div class="flex items-center gap-2">
              <img
                :src="getTokenIcon(option.value)"
                :width="18"
                :height="18"
                :alt="option.label"
                style="max-width: none;"
              >
              <span>{{ option.label }}</span>
            </div>
          </template>
        </Select>
      </div>

      <!-- Chain -->
      <div class="flex flex-col gap-1">
        <FormLabel>{{ T('chain') }}</FormLabel>
        <Select
          v-model="chainModel"
          :disabled="chains.length <= 1"
          :options="chains.map(c => ({ label: c.name, value: c.name }))"
        >
          <template #value="{ option }">
            <div
              v-if="option"
              class="flex items-center gap-2"
            >
              <img
                :src="getChainIcon(option.value)"
                :width="18"
                :height="18"
                :alt="option.label"
              >
              <span>{{ option.label }}</span>
            </div>
          </template>
          <template #option="{ option }">
            <div class="flex items-center gap-2">
              <img
                :src="getChainIcon(option.value)"
                :width="18"
                :height="18"
                :alt="option.label"
              >
              <span>{{ option.label }}</span>
            </div>
          </template>
        </Select>
      </div>
    </div>

    <slot />
  </div>
</template>
