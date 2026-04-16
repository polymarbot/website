/**
 * Auth actions composable
 *
 * Encapsulates authentication operations (OTP send/verify, OAuth, sign-out)
 * with built-in error handling via dialog alerts.
 */
export function useAuthActions () {
  const { alert, confirm } = useDialog()
  const { signOut, waitForLoggedIn } = useAuth()
  const { t, te } = useI18n()

  /**
   * Show error dialog with extracted error message
   */
  function showError (error: unknown) {
    alert({
      message: getErrorMessage(error, { t, te }),
      header: t('common.labels.error'),
      type: 'danger',
    })
  }

  // ============================================================================
  // Send OTP
  // ============================================================================

  /**
   * Send sign-in OTP to the given email
   * @returns true if OTP was sent successfully
   */
  async function sendSignInOtp (params: {
    email: string
    turnstileToken: string
  }): Promise<boolean> {
    try {
      // @ts-expect-error emailOtpSignin plugin types not inferred in Nuxt environment
      const { error } = await authClient.emailOtpSignin.sendOtp(params)
      if (error) {
        showError(error)
        return false
      }
      return true
    } catch (err) {
      console.error('Failed to send sign-in OTP:', err)
      showError(err)
      return false
    }
  }

  /**
   * Send sign-up OTP to the given email
   * @returns true if OTP was sent successfully
   */
  async function sendSignUpOtp (params: {
    email: string
    turnstileToken: string
    inviteCode?: string
  }): Promise<boolean> {
    try {
      // @ts-expect-error emailOtpSignup plugin types not inferred in Nuxt environment
      const { error } = await authClient.emailOtpSignup.sendOtp(params)
      if (error) {
        showError(error)
        return false
      }
      return true
    } catch (err) {
      console.error('Failed to send sign-up OTP:', err)
      showError(err)
      return false
    }
  }

  // ============================================================================
  // Verify OTP
  // ============================================================================

  /**
   * Verify sign-in OTP and wait for session to be established
   * @returns true if verification was successful and user is logged in
   */
  async function verifySignInOtp (params: {
    email: string
    otp: string
  }): Promise<boolean> {
    try {
      // @ts-expect-error emailOtpSignin plugin types not inferred in Nuxt environment
      const { error } = await authClient.emailOtpSignin.verifyOtp(params)
      if (error) {
        showError(error)
        return false
      }
      await waitForLoggedIn()
      return true
    } catch (err) {
      console.error('Failed to verify sign-in OTP:', err)
      showError(err)
      return false
    }
  }

  /**
   * Verify sign-up OTP and wait for session to be established
   * @returns true if verification was successful and user is logged in
   */
  async function verifySignUpOtp (params: {
    email: string
    otp: string
    inviteCode?: string
    marketingEmails?: boolean
  }): Promise<boolean> {
    try {
      // @ts-expect-error emailOtpSignup plugin types not inferred in Nuxt environment
      const { error } = await authClient.emailOtpSignup.verifyOtp(params)
      if (error) {
        showError(error)
        return false
      }
      await waitForLoggedIn()
      return true
    } catch (err) {
      console.error('Failed to verify sign-up OTP:', err)
      showError(err)
      return false
    }
  }

  // ============================================================================
  // OAuth
  // ============================================================================

  /**
   * Initiate OAuth sign-in/sign-up with a social provider
   */
  async function signInWithOAuth (
    provider: 'google' | 'github',
    options?: {
      callbackURL?: string
      errorCallbackURL?: string
      requestSignUp?: boolean
      additionalData?: Record<string, unknown>
    },
  ): Promise<void> {
    await authClient.signIn.social({
      provider,
      callbackURL: options?.callbackURL ?? '/dashboard',
      errorCallbackURL: options?.errorCallbackURL,
      ...(options?.requestSignUp && { requestSignUp: true }),
      ...(options?.additionalData && { additionalData: options.additionalData }),
    })
  }

  /**
   * Resolve OAuth redirect error code to a user-visible message
   * Used to display errors from URL ?error= parameter after OAuth failure
   */
  function resolveOAuthError (rawErrorCode: string): string {
    const errorCode = mapBetterAuthError(rawErrorCode)
    const i18nKey = `server.errors.${errorCode}`
    return te(i18nKey) ? t(i18nKey) : t('server.errors.COMMON_UNKNOWN_ERROR')
  }

  // ============================================================================
  // Sign Out
  // ============================================================================

  /**
   * Sign out the user with confirmation dialog
   * Shows a confirmation dialog before signing out
   * Redirects to sign-in page after successful sign out
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
    sendSignInOtp,
    sendSignUpOtp,
    verifySignInOtp,
    verifySignUpOtp,
    signInWithOAuth,
    resolveOAuthError,
    signOutWithConfirm,
  }
}