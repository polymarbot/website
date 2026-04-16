export default function (): Ref<boolean> {
  const { cookieDomain } = useRuntimeConfig().public
  const darkMode = useCookie<boolean>('darkMode', {
    default: () => true,
    maxAge: 60 * 60 * 24 * 365, // 1 year
    ...(cookieDomain && { domain: cookieDomain as string }),
  }) as Ref<boolean>

  useHead({
    // Inline script reads cookie before hydration (prevents SSG dark mode flash)
    script: [{
      key: 'dark-mode-init',
      innerHTML: '(function(){try{var m=document.cookie.match(/(?:^|;\\s*)darkMode=([^;]*)/);var d=m?m[1]===\'true\':true;document.documentElement.classList.toggle(\'dark\',d)}catch(e){}})()',
    }],
    // Reactive class for SSR and post-hydration updates
    htmlAttrs: {
      class: computed(() => darkMode.value ? 'dark' : ''),
    },
  })

  return darkMode
}
