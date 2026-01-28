<script setup lang="ts">
const TMarkets = useTranslations('pages.app.markets')
const TBots = useTranslations('pages.app.bots')
const TDashboard = useTranslations('pages.app.dashboard')
const TRankings = useTranslations('pages.app.rankings')
const TMe = useTranslations('pages.app.me')
const route = useRoute()
const WebLinkComponent = resolveComponent('WebLink')

interface TabItem {
  label: string
  icon: string
  routeName: string
  isCenter?: boolean
}

const tabItems = computed<TabItem[]>(() => [
  {
    label: TMarkets('name'),
    icon: 'pi pi-chart-line',
    routeName: 'app-markets',
  },
  {
    label: TBots('name'),
    icon: 'pi pi-android',
    routeName: 'app-bots',
  },
  {
    label: TDashboard('name'),
    icon: 'pi pi-objects-column',
    routeName: 'app-dashboard',
    isCenter: true,
  },
  {
    label: TRankings('name'),
    icon: 'pi pi-trophy',
    routeName: 'app-rankings',
  },
  {
    label: TMe('name'),
    icon: 'pi pi-user',
    routeName: 'app-me',
  },
])

/**
 * Check if route is active by comparing route name prefix.
 * Used for highlighting tab items (includes child routes).
 */
function isActive (routeName: string): boolean {
  const currentRouteName = route.name
  if (typeof currentRouteName !== 'string') return false
  return currentRouteName.startsWith(routeName)
}

/**
 * Check if the current route exactly matches the given route name.
 * Used to disable link when already on the exact page.
 */
function isExactRoute (routeName: string): boolean {
  return route.name === routeName
}

/**
 * Get active tab index for indicator positioning.
 */
const activeIndex = computed(() => {
  return tabItems.value.findIndex(item => isActive(item.routeName))
})

// Template ref for nav element
const navRef = ref<HTMLElement>()

// Indicator position and size (measured from DOM)
// Use center position for symmetric animation
const indicatorCenter = ref(0)
const indicatorWidth = ref(0)

/**
 * Update indicator position and width based on actual DOM measurements.
 * Uses center position for symmetric left/right animation.
 */
function updateIndicator () {
  if (!navRef.value) return

  const index = activeIndex.value
  // Hide indicator when no tab is active
  if (index === -1) {
    indicatorWidth.value = 0
    return
  }

  const tabs = navRef.value.querySelectorAll('[data-tab]')
  const tab = tabs[index] as HTMLElement
  if (!tab) return

  const navRect = navRef.value.getBoundingClientRect()
  const tabRect = tab.getBoundingClientRect()

  // Calculate center position relative to nav
  const tabCenter = tabRect.left - navRect.left + tabRect.width / 2
  let width = tabRect.width

  // Hide indicator for the center button
  if (tabItems.value[index]?.isCenter) {
    width = 0
  }

  indicatorCenter.value = tabCenter
  indicatorWidth.value = width
}

// Update indicator on route change
watch(() => route.name, () => {
  nextTick(updateIndicator)
})

// Update on mount and window resize
onMounted(() => {
  updateIndicator()
  window.addEventListener('resize', updateIndicator)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIndicator)
})

/**
 * Indicator style with bounce animation.
 * Uses left position directly for cleaner animation.
 */
const indicatorStyle = computed(() => ({
  left: `${indicatorCenter.value - indicatorWidth.value / 2}px`,
  width: `${indicatorWidth.value}px`,
}))
</script>

<template>
  <div class="h-24">
    <nav
      ref="navRef"
      class="
        fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t
        border-surface bg-surface pb-safe
      "
    >
      <!-- Sliding indicator line (z-0 so center button covers it) -->
      <div
        class="absolute top-0 z-0 h-1 bg-primary"
        :style="indicatorStyle"
        style="transition: left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
      />

      <template
        v-for="item in tabItems"
        :key="item.routeName"
      >
        <!-- Center dashboard button with raised design (no label) -->
        <component
          :is="isExactRoute(item.routeName) ? 'div' : WebLinkComponent"
          v-if="item.isCenter"
          data-tab
          :to="isExactRoute(item.routeName) ? undefined : { name: item.routeName }"
          :unstyled="isExactRoute(item.routeName) ? undefined : true"
          class="relative z-10 flex flex-1 items-center justify-center py-3"
        >
          <div
            class="
              absolute flex h-17 w-17 -translate-y-3 items-center justify-center
              rounded-full shadow-sm transition-all
              active:scale-95
            "
            :class="[
              isActive(item.routeName)
                ? 'bg-primary text-primary-contrast ring-4 ring-primary/30'
                : 'border-2 border-surface bg-emphasis text-muted-color',
            ]"
          >
            <i
              :class="item.icon"
              class="text-2xl"
            />
          </div>
        </component>

        <!-- Regular tab item -->
        <component
          :is="isExactRoute(item.routeName) ? 'div' : WebLinkComponent"
          v-else
          data-tab
          :to="isExactRoute(item.routeName) ? undefined : { name: item.routeName }"
          :unstyled="isExactRoute(item.routeName) ? undefined : true"
          class="
            flex flex-1 flex-col items-center justify-center py-3
            transition-colors
          "
          :class="isActive(item.routeName) ? 'text-primary' : 'text-muted-color'"
        >
          <i
            :class="item.icon"
            class="text-xl"
          />
          <span
            class="mt-1 text-xs"
            :class="{ 'font-medium': isActive(item.routeName) }"
          >
            {{ item.label }}
          </span>
        </component>
      </template>
    </nav>
  </div>
</template>
