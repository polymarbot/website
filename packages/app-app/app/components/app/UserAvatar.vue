<script setup lang="ts">
export interface UserAvatarProps {
  class?: string
}

const props = defineProps<UserAvatarProps>()

const { user } = useAuth()
const { currentPlan, fetchSubscription } = useSubscription()

fetchSubscription()

const SeverityBorderMap: Record<string, string> = {
  secondary: 'border-surface',
  info: 'border-info',
  warn: 'border-warn',
  danger: 'border-danger',
}

const mergedClass = computed(() => {
  const severity = PlanSeverityMap[currentPlan.value]
  return cn('border-2', SeverityBorderMap[severity] ?? 'border-surface', props.class)
})
</script>

<template>
  <Avatar
    :image="user?.image || undefined"
    :fallbackLabel="user?.name?.charAt(0)?.toUpperCase()"
    shape="circle"
    :class="mergedClass"
  />
</template>
