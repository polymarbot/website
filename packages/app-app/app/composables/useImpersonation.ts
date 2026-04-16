/**
 * Composable for impersonation (support login) state
 *
 * Detects whether the current session is an impersonation session
 * and provides utilities to display the banner and stop impersonation.
 */
export function useImpersonation () {
  const { session, user, signOut } = useAuth()

  const isImpersonating = computed(() => {
    const sessionData = session.value?.data?.session as Record<string, unknown> | undefined
    return !!sessionData?.impersonatedBy
  })

  const targetEmail = computed(() => user.value?.email ?? '')

  async function stopImpersonating () {
    await signOut()
    window.close()
  }

  return {
    isImpersonating,
    targetEmail,
    stopImpersonating,
  }
}
