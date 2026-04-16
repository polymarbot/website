<script setup lang="ts">
const appConfig = useAppConfig()
const runtimeConfig = useRuntimeConfig()
const T = useTranslations('components.app.Footer')
const TC = useTranslations('common')
const TPrivacy = useTranslations('pages.legal.privacy-policy')
const TTerms = useTranslations('pages.legal.terms-of-service')

const currentYear = new Date().getFullYear()

const textLinks = computed(() => [
  { label: TTerms('title'), href: '/legal/terms-of-service' },
  { label: TPrivacy('title'), href: '/legal/privacy-policy' },
  { label: TC('actions.reportIssue'), href: appConfig.links.issues },
])
</script>

<template>
  <footer class="bg-surface-950 py-8 text-surface-0">
    <div class="mx-auto max-w-7xl px-4">
      <div
        class="
          flex flex-col items-center gap-6
          md:flex-row md:justify-between
        "
      >
        <!-- Logo + Copyright -->
        <div
          class="
            flex flex-col items-center gap-2
            md:items-start
          "
        >
          <div class="flex items-center gap-2">
            <IconLogo
              :size="24"
              class="text-surface-0"
            />
            <span class="font-semibold">
              {{ runtimeConfig.public.appName }}
            </span>
          </div>
          <p class="text-sm text-surface-400">
            {{ T('copyright', { year: currentYear }) }}
          </p>
        </div>

        <!-- Links -->
        <nav class="flex items-center">
          <template
            v-for="(link, index) in textLinks"
            :key="link.href"
          >
            <Divider
              v-if="index > 0"
              layout="vertical"
            />
            <WebLink
              :href="link.href"
              unstyled
              class="
                text-sm text-surface-400 transition-colors
                hover:text-surface-0 hover:underline
              "
            >
              {{ link.label }}
            </WebLink>
          </template>
        </nav>

        <!-- Social Icons -->
        <AppSocialLinks
          iconClass="text-surface-400 hover:text-surface-0"
        />
      </div>
    </div>
  </footer>
</template>
