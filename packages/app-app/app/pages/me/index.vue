<script setup lang="ts">
definePageMeta({
  title: 'pages.me.name',
})

const T = useTranslations('pages.me')
const TC = useTranslations('common')
const TLanguage = useTranslations('pages.me.language')
const TWallets = useTranslations('pages.wallets')
const TStrategies = useTranslations('pages.strategies')
const TSubscription = useTranslations('pages.subscription')
const { user } = useAuth()
const { signOutWithConfirm } = useAuthActions()
const appConfig = useAppConfig()
const { locale, locales } = useI18n()
const { homepageUrl } = useHomepageUrl()

// Get current locale name for display
const currentLocaleName = computed(() => {
  const loc = locales.value.find(l => l.code === locale.value)
  return loc?.name ?? locale.value
})
</script>

<template>
  <div class="mx-auto flex min-h-[calc(100svh-10rem)] max-w-lg flex-col p-4">
    <!-- Main content -->
    <div class="space-y-4">
      <!-- User profile section with dark mode toggle -->
      <div class="flex items-center gap-4 rounded-xl bg-surface p-4">
        <AppUserAvatar size="xlarge" />
        <div class="min-w-0 flex-1">
          <h2 class="truncate text-lg font-semibold">
            {{ user?.name || T('anonymous') }}
          </h2>
          <p class="truncate text-sm text-muted-color">
            {{ user?.email }}
          </p>
        </div>
        <!-- Dark mode toggle -->
        <AppDarkModeSwitcher class="h-10 w-10 shrink-0" />
      </div>

      <!-- Navigation menu section -->
      <MobileMenuGroup>
        <MobileMenuItem
          beforeIcon="pi pi-wallet"
          :title="TWallets('name')"
          :to="{ name: 'wallets', query: { back: 'true' }}"
        />
        <MobileMenuItem
          beforeIcon="pi pi-book"
          :title="TStrategies('name')"
          :to="{ name: 'strategies', query: { back: 'true' }}"
        />
        <MobileMenuItem
          beforeIcon="pi pi-credit-card"
          :title="TSubscription('name')"
          :to="{ name: 'subscription', query: { back: 'true' }}"
        />
        <MobileMenuItem
          beforeIcon="pi pi-language"
          :title="TLanguage('name')"
          :subtitle="currentLocaleName"
          :to="{ name: 'me-language' }"
        />
        <MobileMenuItem
          beforeIcon="pi pi-flag"
          :title="TC('actions.reportIssue')"
          :href="appConfig.links.issues"
        />
      </MobileMenuGroup>

      <!-- Sign out button -->
      <Button
        severity="danger"
        text
        class="w-full"
        @click="signOutWithConfirm"
      >
        <i class="pi pi-sign-out mr-2" />
        {{ TC('actions.signOut') }}
      </Button>
    </div>

    <!-- Footer: Social links and legal links -->
    <div class="mt-auto flex flex-col items-center gap-4 pt-8 pb-4">
      <!-- Social links -->
      <AppSocialLinks
        :size="24"
        iconClass="text-muted-color hover:text-color"
      />

      <!-- Legal links -->
      <div class="flex items-center gap-4 text-sm">
        <WebLink
          :href="homepageUrl('/legal/privacy-policy', { back: 'true' })"
          class="
            text-primary
            hover:underline
          "
        >
          {{ TC('labels.privacyPolicy') }}
        </WebLink>
        <span class="text-muted-color">
          |
        </span>
        <WebLink
          :href="homepageUrl('/legal/terms-of-service', { back: 'true' })"
          class="
            text-primary
            hover:underline
          "
        >
          {{ TC('labels.termsOfService') }}
        </WebLink>
      </div>
    </div>
  </div>
</template>
