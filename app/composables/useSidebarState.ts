import { useDevice } from './useDevice'

// Global state for sidebar
const isCollapsed = ref(false)
const isDrawerOpen = ref(false)

export function useSidebarState () {
  const { isMobile, isTablet, isDesktop, isMounted } = useDevice()

  // Watch for screen size changes to auto-collapse on tablet
  watch(
    () => isTablet.value,
    newIsTablet => {
      if (newIsTablet && isMounted.value) {
        isCollapsed.value = true
      }
    },
  )

  // Watch for desktop mode to expand sidebar
  watch(
    () => isDesktop.value,
    newIsDesktop => {
      if (newIsDesktop && isMounted.value) {
        isCollapsed.value = false
      }
    },
  )

  // Close drawer when switching away from mobile
  watch(
    () => isMobile.value,
    newIsMobile => {
      if (!newIsMobile) {
        isDrawerOpen.value = false
      }
    },
  )

  const toggleSidebar = () => {
    if (isMobile.value) {
      isDrawerOpen.value = !isDrawerOpen.value
    } else {
      isCollapsed.value = !isCollapsed.value
    }
  }

  const openDrawer = () => {
    isDrawerOpen.value = true
  }

  const closeDrawer = () => {
    isDrawerOpen.value = false
  }

  return {
    isCollapsed,
    isDrawerOpen,
    isMobile,
    isTablet,
    isDesktop,
    isMounted,
    toggleSidebar,
    openDrawer,
    closeDrawer,
  }
}
