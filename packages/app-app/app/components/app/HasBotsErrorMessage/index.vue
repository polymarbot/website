<script setup lang="ts">
export interface HasBotsErrorDetails {
  botCount: number
}

const props = defineProps<{
  details: HasBotsErrorDetails
  strategyId?: string
  funder?: string
}>()

const ns = 'components.app.HasBotsErrorMessage'

const botsUrl = computed(() => {
  if (props.strategyId) return `/bots?strategyId=${props.strategyId}&back=true`
  if (props.funder) return `/bots?funder=${props.funder}&back=true`
  return '/bots'
})
</script>

<template>
  <p class="whitespace-pre-wrap text-muted-color">
    <i18n-t :keypath="`${ns}.message`">
      <template #count>
        <span class="font-semibold text-danger">
          {{ details.botCount }}
        </span>
      </template>
      <template #link>
        <WebLink :href="botsUrl">
          {{ $t(`${ns}.viewBots`) }}
        </WebLink>
      </template>
    </i18n-t>
  </p>
</template>
