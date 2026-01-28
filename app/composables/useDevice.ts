import { ref, onMounted, onUnmounted } from 'vue'

type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

function getScreenSize (): ScreenSize {
  if (typeof window === 'undefined') {
    return 'md'
  }

  const width = window.innerWidth
  if (width < 640) {
    return 'xs'
  } else if (width < 768) {
    return 'sm'
  } else if (width < 1024) {
    return 'md'
  } else if (width < 1280) {
    return 'lg'
  } else if (width < 1536) {
    return 'xl'
  } else {
    return '2xl'
  }
}

function isSafariAgent (): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

export function useDevice () {
  const isMobile = ref(false)
  const isTablet = ref(false)
  const isDesktop = ref(false)
  const isSafari = ref(false)
  const screenSize = ref<ScreenSize>('md')
  const isMounted = ref(false)

  const updateDeviceInfo = () => {
    const currentScreenSize = getScreenSize()
    screenSize.value = currentScreenSize
    isMobile.value = [ 'xs', 'sm' ].includes(currentScreenSize)
    isTablet.value = [ 'md', 'lg' ].includes(currentScreenSize)
    isDesktop.value = [ 'xl', '2xl' ].includes(currentScreenSize)
    isSafari.value = isSafariAgent()
  }

  onMounted(() => {
    isMounted.value = true
    updateDeviceInfo()
    window.addEventListener('resize', updateDeviceInfo)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateDeviceInfo)
  })

  return {
    isMobile,
    isTablet,
    isDesktop,
    isSafari,
    screenSize,
    isMounted,
  }
}
