<script setup lang="ts">
import type { MenuItem } from '~/components/ui/Menu.vue'

const props = defineProps<{
  class?: ClassValue
}>()

defineOptions({ inheritAttrs: false })

const T = useTranslations('components.app.LanguageSwitcher')
const { locale, locales, setLocale } = useI18n()

const buttonClass = computed(() => {
  return cn(
    `
      h-9 w-9 bg-surface
      hover:bg-emphasis
    `,
    props.class,
  )
})

const currentLocale = computed(() => {
  return locales.value.find(l => l.code === locale.value)
})

const languageMenuItems = computed<MenuItem[]>(() => {
  return locales.value.map(loc => ({
    label: loc.name,
    command: () => setLocale(loc.code),
    class: loc.code === locale.value ? 'bg-emphasis' : '',
  }))
})
</script>

<template>
  <Dropdown
    :menus="languageMenuItems"
    trigger="click"
  >
    <Button
      outlined
      rounded
      :aria-label="T('switchLanguage')"
      :title="currentLocale?.name"
      :class="buttonClass"
    >
      <i class="pi pi-language text-base" />
    </Button>
  </Dropdown>
</template>
