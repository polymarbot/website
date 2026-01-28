<script setup lang="ts">
defineProps<{
  currentBalance: string
  requiredBalance: string
  shortfall: string
}>()

const ns = 'pages.app.bots.components.InsufficientBalanceMessage'
const T = useTranslations(ns)
const { botBalanceMultiplier } = useRuntimeConfig().public
</script>

<template>
  <div class="space-y-3">
    <p>{{ T('description') }}</p>
    <p class="text-muted-color">
      <i18n-t :keypath="`${ns}.calculation`">
        <template #multiplier>
          <span class="font-semibold text-success">
            {{ botBalanceMultiplier }}
          </span>
        </template>
      </i18n-t>
    </p>
    <ul class="list-none space-y-1 rounded-border px-3 py-2 bg-emphasis">
      <li class="flex justify-between">
        <span class="text-muted-color">
          {{ T('current') }}
        </span>
        <span class="font-medium">
          {{ formatCurrency(currentBalance) }}
        </span>
      </li>
      <li class="flex justify-between">
        <span class="text-muted-color">
          {{ T('required') }}
        </span>
        <span class="font-medium text-success">
          {{ formatCurrency(requiredBalance) }}
        </span>
      </li>
      <li class="flex justify-between border-t border-surface pt-1">
        <span class="text-muted-color">
          {{ T('shortfall') }}
        </span>
        <span class="font-semibold text-danger">
          {{ formatCurrency(shortfall) }}
        </span>
      </li>
    </ul>
    <p class="text-muted-color">
      {{ T('suggestion') }}
    </p>
  </div>
</template>
