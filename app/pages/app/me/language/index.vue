<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'pages.app.me.language.name',
})

const T = useTranslations('pages.app.me.language')
const { locale, locales, setLocale } = useI18n()
const router = useRouter()

async function selectLanguage (code: LocaleCode) {
  await setLocale(code)
  router.back()
}
</script>

<template>
  <div class="mx-auto max-w-lg p-4">
    <MobileMenuGroup :title="T('title')">
      <MobileMenuItem
        v-for="loc in locales"
        :key="loc.code"
        :title="loc.name || loc.code"
        :afterIcon="locale === loc.code ? 'pi pi-check' : undefined"
        @click="selectLanguage(loc.code)"
      />
    </MobileMenuGroup>
  </div>
</template>
