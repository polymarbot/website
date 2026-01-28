<script setup lang="ts">
const { isCollapsed, isMobile, toggleSidebar } = useSidebarState()
</script>

<template>
  <div class="flex h-svh">
    <!-- Desktop/Tablet Sidebar -->
    <AppSidebar
      v-if="!isMobile"
      :collapsed="isCollapsed"
    />

    <div class="flex h-full flex-1 flex-col overflow-hidden">
      <AppNavbar
        :isMobile="isMobile"
        :isCollapsed="isCollapsed"
        @toggleSidebar="toggleSidebar"
      />

      <main
        class="
          flex-1 overflow-auto p-1
          sm:p-4
        "
      >
        <div>
          <slot />
        </div>

        <!-- Mobile Bottom Tab Bar -->
        <AppBottomTabBar v-if="isMobile" />
      </main>
    </div>
  </div>
</template>
