/**
 * Check if route name starts with a given prefix.
 * Route names are locale-independent (e.g., 'auth-sign-in', 'dashboard').
 */
function routeNameStartsWith (routeName: unknown, prefix: string): boolean {
  if (typeof routeName !== 'string') return false
  return routeName.startsWith(prefix)
}

export default defineNuxtRouteMiddleware(async to => {
  let isLoggedIn: boolean

  if (import.meta.server) {
    // Server-side: use useFetch to enable SSR session fetching
    const { data: session } = await authClient.useSession(useFetch)
    isLoggedIn = !!session.value
  } else {
    // Client-side: use reactive auth state from createAuthState
    const session = authClient.useSession()
    const { loggedIn, ready, refresh } = createAuthState(session)
    await ready()

    // Retry once if session appears invalid (handles transient fetch failures)
    if (!loggedIn.value) {
      await refresh()
    }

    isLoggedIn = loggedIn.value
  }

  // Auth pages (sign-in, sign-up) - redirect to dashboard if already logged in
  const isAuthPage = routeNameStartsWith(to.name, 'auth-')

  if (isAuthPage && isLoggedIn) {
    return navigateTo('/dashboard')
  }

  // All non-auth pages require authentication
  if (!isAuthPage) {
    if (!isLoggedIn) {
      return navigateTo('/auth/sign-in')
    }
    // Redirect root to dashboard
    if (to.path === '/') {
      return navigateTo('/dashboard')
    }
  }
})
