<script setup lang="ts">
const namespace = 'components.app.ImpersonationBanner'
const T = useTranslations(namespace)

const { isImpersonating, targetEmail, stopImpersonating } = useImpersonation()

const stopping = ref(false)

async function handleStop () {
  stopping.value = true
  try {
    await stopImpersonating()
  } finally {
    stopping.value = false
  }
}
</script>

<template>
  <div
    v-if="isImpersonating"
    class="
      flex items-center justify-center gap-3 bg-orange-400 px-4 py-2 font-medium
      dark:bg-orange-600
    "
  >
    <i18n-t :keypath="`${namespace}.viewingAs`">
      <template #email>
        <span
          class="
            font-semibold text-sky-800 underline
            dark:text-sky-200
          "
        >
          {{ targetEmail }}
        </span>
      </template>
    </i18n-t>
    <Button
      class="leading-none"
      :label="T('stop')"
      :loading="stopping"
      size="small"
      @click="handleStop"
    />
  </div>
</template>
