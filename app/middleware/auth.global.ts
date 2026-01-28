/**
 * Check if route name starts with a given prefix.
 * Route names are locale-independent (e.g., 'auth-sign-in', 'app-dashboard').
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
    const { loggedIn, ready } = createAuthState(session)
    await ready()
    isLoggedIn = loggedIn.value
  }

  // Auth pages (sign-in, sign-up) - redirect to dashboard if already logged in
  const isAuthPage = routeNameStartsWith(to.name, 'auth-')

  if (isAuthPage && isLoggedIn) {
    return navigateTo('/app/dashboard')
  }

  // Protected /app routes - require authentication
  const isAppPage = routeNameStartsWith(to.name, 'app-') || to.name === 'app'
  if (isAppPage) {
    if (!isLoggedIn) {
      return navigateTo('/auth/sign-in')
    }
    // Redirect /app to /app/dashboard
    if (to.name === 'app') {
      return navigateTo('/app/dashboard')
    }
  }
})
