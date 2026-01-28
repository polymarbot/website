<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'pages.app.me.name',
})

const T = useTranslations('pages.app.me')
const TC = useTranslations('common')
const TLanguage = useTranslations('pages.app.me.language')
const TWallets = useTranslations('pages.app.wallets')
const TStrategies = useTranslations('pages.app.strategies')
const TSubscription = useTranslations('pages.app.subscription')
const TPrivacy = useTranslations('pages.legal.privacy-policy')
const TTerms = useTranslations('pages.legal.terms-of-service')
const { user, signOutWithConfirm } = useAuth()
const appConfig = useAppConfig()
const { locale, locales } = useI18n()

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
        <Avatar
          :image="user?.image || undefined"
          :fallbackLabel="user?.name?.charAt(0)?.toUpperCase()"
          size="xlarge"
          shape="circle"
        />
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
          :to="{ name: 'app-wallets', query: { back: 'true' }}"
        />
        <MobileMenuItem
          beforeIcon="pi pi-book"
          :title="TStrategies('name')"
          :to="{ name: 'app-strategies', query: { back: 'true' }}"
        />
        <MobileMenuItem
          beforeIcon="pi pi-credit-card"
          :title="TSubscription('name')"
          :to="{ name: 'app-subscription', query: { back: 'true' }}"
        />
        <MobileMenuItem
          beforeIcon="pi pi-language"
          :title="TLanguage('name')"
          :subtitle="currentLocaleName"
          :to="{ name: 'app-me-language' }"
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
          :to="{ path: '/legal/privacy-policy', query: { back: 'true' }}"
          class="
            text-primary
            hover:underline
          "
        >
          {{ TPrivacy('title') }}
        </WebLink>
        <span class="text-muted-color">
          |
        </span>
        <WebLink
          :to="{ path: '/legal/terms-of-service', query: { back: 'true' }}"
          class="
            text-primary
            hover:underline
          "
        >
          {{ TTerms('title') }}
        </WebLink>
      </div>
    </div>
  </div>
</template>
