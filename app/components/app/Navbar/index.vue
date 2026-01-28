<script setup lang="ts">
defineProps<{
  isMobile?: boolean
  isCollapsed?: boolean
}>()

const emit = defineEmits<{
  toggleSidebar: []
}>()

const T = useTranslations('components.app.Navbar')
const route = useRoute()
const router = useRouter()

/**
 * Check if back button should be shown on mobile.
 * Logic:
 * 1. If back query param exists: show unless back === 'false'
 * 2. If no back query param: show if path matches second-level under app
 */
const showMobileBack = computed(() => {
  // Check if back query param exists
  if (route.query.back !== undefined) {
    return route.query.back !== 'false'
  }

  // Auto-detect second-level app paths (e.g., /app/wallets/xxx, /app/me/language)
  const pathSegments = route.path.split('/').filter(Boolean)
  // Pattern: ['app', 'category', 'subcategory', ...]
  return pathSegments.length >= 3 && pathSegments[0] === 'app'
})

function handleBack () {
  router.back()
}
</script>

<template>
  <header
    class="
      flex h-14 items-stretch justify-between border-b border-surface bg-surface
    "
  >
    <!-- Mobile: Back button and logo -->
    <div
      v-if="isMobile"
      class="flex items-stretch"
    >
      <Transition
        enterActiveClass="transition-all duration-100 ease-out"
        enterFromClass="w-0 opacity-0"
        enterToClass="w-14 opacity-100"
        leaveActiveClass="transition-all duration-100 ease-in"
        leaveFromClass="w-14 opacity-100"
        leaveToClass="w-0 opacity-0"
      >
        <div
          v-if="showMobileBack"
          class="overflow-hidden"
        >
          <Button
            text
            class="h-full w-14 rounded-none border-0 border-r border-surface"
            :aria-label="T('goBack')"
            @click="handleBack"
          >
            <i class="pi pi-arrow-left text-xl" />
          </Button>
        </div>
      </Transition>
      <div class="flex w-14 items-center justify-center border-r border-surface">
        <AppBrand iconOnly />
      </div>
    </div>

    <!-- Desktop/Tablet: Sidebar toggle button -->
    <Button
      v-else
      text
      class="w-14 rounded-none border-x border-y-0 border-surface"
      :aria-label="isCollapsed ? T('expandSidebar') : T('collapseSidebar')"
      @click="emit('toggleSidebar')"
    >
      <IconSidebarToggle
        class="text-xl transition-transform"
        :class="{ '[transform:rotateY(180deg)]': !isCollapsed }"
      />
    </Button>

    <div class="flex flex-1 items-stretch justify-between px-4">
      <div class="flex items-center">
        <AppBreadcrumb />
      </div>

      <div
        v-if="!isMobile"
        class="flex items-center gap-3"
      >
        <AppLanguageSwitcher />
        <AppDarkModeSwitcher />

        <AppProfileDropdown
          class="h-full"
          buttonClass="-mr-4 h-full rounded-none px-4"
        />
      </div>
    </div>
  </header>
</template>
