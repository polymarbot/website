import type { DeepReadonly, Ref } from 'vue'
import { createAuthClient } from 'better-auth/vue'
import { emailOTPClient } from 'better-auth/client/plugins'
import type { emailOtpSignup } from '~~/server/utils/auth/plugins/emailOtpSignup'

/**
 * Client plugin for emailOtpSignup server plugin
 * Infers types from server plugin endpoints
 */
const emailOtpSignupClient = () => ({
  id: 'email-otp-signup' as const,
  $InferServerPlugin: {} as ReturnType<typeof emailOtpSignup>,
})

/**
 * Better-auth client for frontend authentication
 */
export const authClient = createAuthClient({
  plugins: [
    emailOTPClient(),
    emailOtpSignupClient(),
  ],
})

// Session type from better-auth $Infer
type Session = typeof authClient.$Infer.Session

// SessionRef: the reactive ref returned by useSession() without arguments
type SessionRef = DeepReadonly<Ref<{
  data: Session | null
  isPending: boolean
  isRefetching: boolean
  error: Error | null
}>>

/**
 * Create reactive auth state from a session object
 * Can be used in both components and middleware
 */
export function createAuthState (session: SessionRef) {
  const user = computed(() => session.value?.data?.user ?? null)
  const loggedIn = computed(() => !!session.value?.data)
  const loading = computed(() => session.value?.isPending ?? true)

  /**
   * Wait for session to finish loading (initial fetch)
   */
  function ready (): Promise<void> {
    return new Promise(resolve => {
      if (!loading.value) {
        resolve()
        return
      }
      const unwatch = watch(loading, val => {
        if (!val) {
          unwatch()
          resolve()
        }
      })
    })
  }

  /**
   * Wait for user to be logged in
   */
  function waitForLoggedIn (): Promise<void> {
    return new Promise(resolve => {
      if (loggedIn.value) {
        resolve()
        return
      }
      const unwatch = watch(loggedIn, val => {
        if (val) {
          unwatch()
          resolve()
        }
      })
    })
  }

  /**
   * Wait for user to be logged out
   */
  function waitForLoggedOut (): Promise<void> {
    return new Promise(resolve => {
      if (!loggedIn.value) {
        resolve()
        return
      }
      const unwatch = watch(loggedIn, val => {
        if (!val) {
          unwatch()
          resolve()
        }
      })
    })
  }

  /**
   * Refresh the session from the server
   */
  async function refresh () {
    // @ts-expect-error refetch exists at runtime but missing from type definitions
    await session.value.refetch()
  }

  return {
    session,
    user,
    loggedIn,
    loading,
    ready,
    waitForLoggedIn,
    waitForLoggedOut,
    refresh,
  }
}
