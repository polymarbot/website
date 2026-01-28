// Singleton to ensure darkMode ref is shared across all calls
let darkModeRef: Ref<boolean> | null = null
let watchInitialized = false

export default function (): Ref<boolean> {
  // Reuse existing ref or create new one
  if (!darkModeRef) {
    darkModeRef = useCookie<boolean>('darkMode', {
      default: () => true,
      maxAge: 60 * 60 * 24 * 365, // 1 year
    }) as Ref<boolean>
  }

  // Only run on client side - document doesn't exist during SSR
  if (import.meta.client && !watchInitialized) {
    watchInitialized = true

    setTimeout(() => {
      watch(darkModeRef!, (value: boolean) => {
        document.documentElement.classList.toggle('dark', value)
      }, { immediate: true })
    })
  }

  return darkModeRef
}
