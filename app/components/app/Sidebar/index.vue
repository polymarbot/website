<script setup lang="ts">
const props = defineProps<{
  collapsed?: boolean
  hideHeader?: boolean
  isMobile?: boolean
}>()

const TDashboard = useTranslations('pages.app.dashboard')
const TMarkets = useTranslations('pages.app.markets')
const TBots = useTranslations('pages.app.bots')
const TWallets = useTranslations('pages.app.wallets')
const TStrategies = useTranslations('pages.app.strategies')
const TRankings = useTranslations('pages.app.rankings')
const TSubscription = useTranslations('pages.app.subscription')
const route = useRoute()
const WebLinkComponent = resolveComponent('WebLink')

const navItems = computed(() => [
  {
    label: TDashboard('name'),
    icon: 'pi pi-objects-column',
    routeName: 'app-dashboard',
  },
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
    label: TWallets('name'),
    icon: 'pi pi-wallet',
    routeName: 'app-wallets',
  },
  {
    label: TStrategies('name'),
    icon: 'pi pi-book',
    routeName: 'app-strategies',
  },
  {
    label: TRankings('name'),
    icon: 'pi pi-trophy',
    routeName: 'app-rankings',
  },
  {
    label: TSubscription('name'),
    icon: 'pi pi-credit-card',
    routeName: 'app-subscription',
  },
])

/**
 * Check if route is active by comparing route name prefix.
 * Used for highlighting menu items (includes child routes).
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
</script>

<template>
  <aside
    class="flex h-full flex-col bg-surface transition-all duration-300"
    :class="props.collapsed ? 'w-16' : 'w-60'"
  >
    <div
      v-if="!props.hideHeader"
      class="flex h-14 items-center border-b border-surface"
      :class="props.collapsed ? 'justify-center px-2' : 'gap-2 px-4'"
    >
      <AppBrand :iconOnly="props.collapsed" />
    </div>

    <nav
      class="flex-1 overflow-hidden py-3 transition-all duration-300"
      :class="props.collapsed ? 'px-1' : 'px-3'"
    >
      <Menu
        :model="navItems"
        class="min-w-0 border-none bg-transparent"
      >
        <template #item="{ item }">
          <Tooltip
            :text="props.collapsed ? String(item.label) : undefined"
            position="right"
            class="block"
          >
            <component
              :is="isExactRoute(item.routeName) ? 'div' : WebLinkComponent"
              :to="isExactRoute(item.routeName) ? undefined : { name: item.routeName }"
              :unstyled="isExactRoute(item.routeName) ? undefined : true"
              class="
                flex items-center rounded-lg px-3 py-2 text-lg whitespace-nowrap
                transition-colors
              "
              :class="[
                props.collapsed ? 'justify-center' : 'gap-4',
                {
                  'bg-primary/10 text-primary': isActive(item.routeName),
                  'text-muted-color hover:bg-emphasis': !isActive(item.routeName),
                },
              ]"
            >
              <i
                :class="item.icon"
                class="text-xl"
              />
              <span v-if="!props.collapsed">
                {{ item.label }}
              </span>
            </component>
          </Tooltip>
        </template>
      </Menu>
    </nav>

    <!-- Mobile footer with user controls -->
    <div
      v-if="props.isMobile"
      class="
        flex items-center justify-between border-t border-surface px-3 py-2
      "
      @click.stop
    >
      <AppProfileDropdown
        buttonClass="px-2"
        nameClass="max-w-24 truncate"
      />

      <!-- Controls -->
      <div class="flex items-center gap-2">
        <AppLanguageSwitcher />
        <AppDarkModeSwitcher />
      </div>
    </div>
  </aside>
</template>
