<script setup lang="ts">
/**
 * AddressDisplay Component
 *
 * Displays Ethereum addresses or transaction hashes with formatting, tooltips, and copy functionality.
 *
 * Features:
 * - Formats long addresses using formatWalletAddress
 * - Shows full address in tooltip on hover
 * - Optional clickable link (opens in new tab)
 * - Copy button to copy full address
 * - Scalable with em units - adjust size via font-size
 */

export interface AddressDisplayProps {
  /** The full Ethereum address or transaction hash */
  address: string
  /** Optional URL to navigate to when clicking the address */
  href?: string
  /** Optional name to display before the address */
  name?: string
  /** Optional balance to display after the address */
  balance?: number | string
  /** Whether to show the copy button */
  copyable?: boolean
}

const props = withDefaults(defineProps<AddressDisplayProps>(), {
  href: undefined,
  name: undefined,
  balance: undefined,
  copyable: false,
})

// Format the address for display
const formattedAddress = computed(() => formatWalletAddress(props.address))
</script>

<template>
  <div class="inline-flex items-center gap-x-2 text-[1em]">
    <!-- Copy button -->
    <CopyButton
      v-if="copyable"
      :copy="address"
      text
      class="h-[2em] w-[2em] text-[0.875em]"
    />

    <!-- Name (optional) -->
    <span
      v-if="name"
      class="font-medium"
    >
      {{ name }}
    </span>

    <div class="inline-flex items-center gap-x-2">
      <span v-if="name">
        -
      </span>
      <!-- Address text (clickable if href provided) -->
      <Tooltip
        :text="address"
        :options="{ pt: { root: 'max-w-none' }}"
      >
        <WebLink
          v-if="href"
          :href="href"
          unstyled
          class="hover:underline"
        >
          {{ formattedAddress }}
        </WebLink>
        <span v-else>
          {{ formattedAddress }}
        </span>
      </Tooltip>

      <!-- Balance (optional) -->
      <span
        v-if="balance !== undefined"
        class="text-muted-color"
      >
        ({{ formatCurrency(balance) }})
      </span>
    </div>
  </div>
</template>
