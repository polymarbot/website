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
  const { confirm } = useDialog()
  const { t } = useI18n()

  /**
   * Sign out the user
   * Returns a promise that resolves after sign out completes and session state is updated
   */
  async function signOut (): Promise<void> {
    await clientSignOut()
    await authState.waitForLoggedOut()
  }

  /**
   * Sign out the user with confirmation dialog
   * Shows a confirmation dialog before signing out
   * Navigates to sign-in page after successful sign out
   */
  async function signOutWithConfirm (): Promise<void> {
    const confirmed = await confirm({
      type: 'warn',
      header: t('common.dialogs.signOutConfirm.title'),
      message: t('common.dialogs.signOutConfirm.message'),
      acceptLabel: t('common.actions.signOut'),
      icon: 'pi pi-sign-out',
    })

    if (confirmed) {
      try {
        await signOut()
        navigateTo('/auth/sign-in')
      } catch (error) {
        console.error('Sign out failed:', error)
      }
    }
  }

  return {
    ...authState,
    signOut,
    signOutWithConfirm,
  }
}
