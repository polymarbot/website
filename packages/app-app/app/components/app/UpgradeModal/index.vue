<script setup lang="ts">
export interface UpgradeModalProps {
  visible?: boolean
  /** Target plan required to unlock the feature */
  targetPlan?: SubscriptionPlanType
}

const props = defineProps<UpgradeModalProps>()
const emit = defineEmits<{ 'update:visible': [value: boolean]}>()

const T = useTranslations('components.app.UpgradeModal')

const displayMessage = computed(() => {
  if (!props.targetPlan) return T('message')
  const planName = SUBSCRIPTION_PLANS[props.targetPlan].name
  return T('messageWithTarget', { plan: planName })
})

function handleConfirm () {
  navigateTo('/subscription')
}
</script>

<template>
  <Modal
    :visible="visible"
    :title="T('title')"
    :confirmText="T('upgradeButton')"
    showCancel
    @update:visible="emit('update:visible', $event)"
    @confirm="handleConfirm"
  >
    <p class="text-muted-color">
      {{ displayMessage }}
    </p>
  </Modal>
</template>
