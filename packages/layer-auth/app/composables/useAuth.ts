/**
 * Composable for authentication state and actions
 * Extends createAuthState with UI-related functionality
 *
 * NOTE: Must be called from within a Vue component setup context
 */
export function useAuth () {
  const session = authClient.useSession()
  const authState = createAuthState(session)
  const { signOut: clientSignOut } = authClient

  /**
   * Sign out the user
   * Returns a promise that resolves after sign out completes and session state is updated
   */
  async function signOut (): Promise<void> {
    await clientSignOut()
    await authState.waitForLoggedOut()
  }

  return {
    ...authState,
    signOut,
  }
}
