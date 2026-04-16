<script setup lang="ts">
import type { BottomTabBarItem } from '@packages/layer-basic/app/components/ui/BottomTabBar.vue'

const TMarkets = useTranslations('pages.markets')
const TBots = useTranslations('pages.bots')
const TDashboard = useTranslations('pages.dashboard')
const TRankings = useTranslations('pages.rankings')
const TMe = useTranslations('pages.me')

const tabItems = computed<BottomTabBarItem[]>(() => [
  {
    label: TMarkets('name'),
    icon: 'pi pi-chart-line',
    routeName: 'markets',
  },
  {
    label: TBots('name'),
    icon: 'pi pi-android',
    routeName: 'bots',
  },
  {
    label: TDashboard('name'),
    icon: 'pi pi-objects-column',
    routeName: 'dashboard',
    isCenter: true,
  },
  {
    label: TRankings('name'),
    icon: 'pi pi-trophy',
    routeName: 'rankings',
  },
  {
    label: TMe('name'),
    icon: 'pi pi-user',
    routeName: 'me',
  },
])
</script>

<template>
  <BottomTabBar :items="tabItems" />
</template>
