<script setup lang="ts">
export interface BotInfo {
  symbol: string
  interval: string
}

export interface HasBotsErrorDetails {
  botCount: number
  bots: BotInfo[]
}

defineProps<{
  details: HasBotsErrorDetails
}>()

const ns = 'components.app.HasBotsErrorMessage'

// Generate market page URL for a bot
function getMarketUrl (bot: BotInfo) {
  return `/app/markets/${bot.symbol}-${bot.interval}`
}
</script>

<template>
  <div class="space-y-4">
    <p class="whitespace-pre-wrap text-muted-color">
      <i18n-t :keypath="`${ns}.message`">
        <template #count>
          <span class="font-semibold text-danger">
            {{ details.botCount }}
          </span>
        </template>
      </i18n-t>
    </p>

    <!-- Bot list -->
    <div class="flex flex-wrap gap-2">
      <Button
        v-for="bot in details.bots"
        :key="`${bot.symbol}-${bot.interval}`"
        :href="getMarketUrl(bot)"
        target="_blank"
        severity="secondary"
        outlined
        size="small"
      >
        <img
          :src="`/img/symbol/${bot.symbol}.webp`"
          :alt="bot.symbol"
          class="size-4 rounded-full"
        >
        {{ bot.symbol.toUpperCase() }} / {{ bot.interval }}
        <i class="pi pi-external-link text-xs" />
      </Button>

      <!-- Show more indicator -->
      <span
        v-if="details.botCount > 3"
        class="flex items-center px-2.5 py-1.5 text-sm text-muted-color"
      >
        <i18n-t :keypath="`${ns}.andMore`">
          <template #count>
            <span class="font-semibold text-danger">
              {{ details.botCount - 3 }}
            </span>
          </template>
        </i18n-t>
      </span>
    </div>
  </div>
</template>
