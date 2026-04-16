<script setup lang="ts">
const props = defineProps<{
  class?: ClassValue
}>()

defineOptions({ inheritAttrs: false })

const T = useTranslations('components.app.DarkModeSwitcher')
const darkMode = useDarkMode()

const buttonClass = computed(() => {
  return cn(
    `
      h-9 w-9 bg-surface
      hover:bg-emphasis
    `,
    props.class,
  )
})

function toggle (event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const isDark = darkMode.value

  pageSwitchAnimate(
    target,
    () => {
      darkMode.value = !isDark
    },
    { reverse: !isDark },
  )
}
</script>

<template>
  <Button
    outlined
    rounded
    :aria-label="darkMode ? T('switchToLight') : T('switchToDark')"
    :title="darkMode ? T('darkMode') : T('lightMode')"
    :class="buttonClass"
    @click="toggle"
  >
    <i :class="darkMode ? 'pi pi-moon' : 'pi pi-sun'" />
  </Button>
</template>
