<script setup lang="ts">
definePageMeta({
  layout: 'transparent',
  title: 'pages.auth.sign-up.name',
})

const { t, te } = useI18n()
const T = useTranslations('pages.auth.sign-up')
const TC = useTranslations('common')
const TErrors = useTranslations('server.errors')
const TPrivacy = useTranslations('pages.legal.privacy-policy')
const TTerms = useTranslations('pages.legal.terms-of-service')
const route = useRoute()
const dialog = useDialog()
const { waitForLoggedIn } = useAuth()
const runtimeConfig = useRuntimeConfig()

// App configuration
const inviteCodeRequired = runtimeConfig.public.inviteCodeRequired

// Step state
const step = ref<'email' | 'code'>('email')
const loading = ref(false)

// Turnstile component ref for reset functionality
const turnstileRef = ref<{ reset: () => void } | null>(null)
const turnstileToken = ref('')
const showTurnstile = ref(false)

// Resend countdown timer
const { remaining: resendCountdown, isActive: isResendDisabled, start: startResendCountdown } = useCountdown({ duration: 60 })

// Terms and marketing preferences (not validated by Zod)
const agreeToTerms = ref(false)
const marketingEmails = ref(false)

// Shake animation states
const shakeTerms = ref(false)
const shakeInviteCode = ref(false)

// Page-level error message
const pageError = ref('')

// Form state
const formState = reactive({
  email: '',
  inviteCode: '',
  otp: '',
})

// Dynamic schema based on current step
const schema = computed(() => {
  if (step.value === 'email') {
    return createApiValidationSchema('POST', '/api/auth/email-otp-signup/send-otp')
      .omit({ turnstileToken: true }) // Turnstile is validated separately
  }
  return createApiValidationSchema('POST', '/api/auth/email-otp-signup/verify-otp')
    .omit({ marketingEmails: true }) // Checkbox doesn't need Zod validation
})

// Use form composable
const { validate, validateField, validationResult } = useForm(formState, {
  schema,
  autoValidate: false,
})

// Check for redirect errors in URL
onMounted(() => {
  const rawErrorCode = route.query.error as string
  if (rawErrorCode) {
    const errorCode = mapBetterAuthError(rawErrorCode)
    const i18nKey = `server.errors.${errorCode}`
    pageError.value = te(i18nKey) ? TErrors(errorCode) : TErrors('COMMON_UNKNOWN_ERROR')
  }
})

// Trigger shake animation
function triggerShake (target: 'terms' | 'inviteCode') {
  if (target === 'terms') {
    shakeTerms.value = true
    setTimeout(() => {
      shakeTerms.value = false
    }, 500)
  } else {
    shakeInviteCode.value = true
    setTimeout(() => {
      shakeInviteCode.value = false
    }, 500)
  }
}

// Check if form is valid for submission (email step)
const canSubmit = computed(() => {
  return !!formState.email && !!turnstileToken.value
})

// Send verification code
async function sendCode () {
  if (!canSubmit.value || loading.value) return

  // Check terms agreement
  if (!agreeToTerms.value) {
    triggerShake('terms')
    return
  }

  // Check invite code requirement
  if (inviteCodeRequired && !formState.inviteCode) {
    triggerShake('inviteCode')
    return
  }

  // Validate form
  try {
    await validate([ 'email', 'inviteCode' ])
  } catch {
    return
  }

  loading.value = true

  try {
    // @ts-expect-error emailOtpSignup plugin types not inferred in Nuxt environment
    const { error } = await authClient.emailOtpSignup.sendOtp({
      email: formState.email,
      inviteCode: formState.inviteCode || undefined,
      turnstileToken: turnstileToken.value,
    })

    if (error) {
      // Reset Turnstile on error for retry
      turnstileRef.value?.reset()
      dialog.alert({
        message: getErrorMessage(error, t, te),
        header: t('common.labels.error'),
        type: 'danger',
      })
      return
    }

    step.value = 'code'
    startResendCountdown()
  } catch (err) {
    console.error('Failed to send verification code:', err)
    // Reset Turnstile on error for retry
    turnstileRef.value?.reset()
    dialog.alert({
      message: getErrorMessage(err, t, te),
      header: t('common.labels.error'),
      type: 'danger',
    })
  } finally {
    loading.value = false
  }
}

// Verify code and sign up
async function verifyCode () {
  if (!formState.otp || loading.value) return

  // Validate OTP
  try {
    await validate([ 'otp' ])
  } catch {
    return
  }

  loading.value = true

  try {
    // @ts-expect-error emailOtpSignup plugin types not inferred in Nuxt environment
    const { error } = await authClient.emailOtpSignup.verifyOtp({
      email: formState.email,
      otp: formState.otp,
      inviteCode: formState.inviteCode || undefined,
      marketingEmails: marketingEmails.value,
    })

    if (error) {
      dialog.alert({
        message: getErrorMessage(error, t, te),
        header: t('common.labels.error'),
        type: 'danger',
      })
      return
    }

    // Wait for session state to update before navigation
    await waitForLoggedIn()

    // Redirect to dashboard
    await navigateTo('/app/dashboard')
  } catch (err) {
    console.error('Failed to verify code:', err)
    dialog.alert({
      message: getErrorMessage(err, t, te),
      header: t('common.labels.error'),
      type: 'danger',
    })
  } finally {
    loading.value = false
  }
}

// Reset to email step
function resetToEmail () {
  step.value = 'email'
  formState.otp = ''
}

// Auto-submit when code is complete
watch(() => formState.otp, newCode => {
  if (newCode.length === 6) {
    verifyCode()
  }
})

// OAuth sign-up
async function signUpWithProvider (provider: 'google' | 'github') {
  // Check terms agreement
  if (!agreeToTerms.value) {
    triggerShake('terms')
    return
  }

  // Check invite code requirement
  if (inviteCodeRequired && !formState.inviteCode) {
    triggerShake('inviteCode')
    return
  }

  // Use better-auth's built-in social sign-in with requestSignUp flag
  await authClient.signIn.social({
    provider,
    callbackURL: '/app/dashboard',
    errorCallbackURL: '/auth/sign-up',
    // Request sign-up (required when disableImplicitSignUp is true)
    requestSignUp: true,
    // Pass invite code and marketing preference through OAuth flow
    additionalData: {
      inviteCode: formState.inviteCode || undefined,
      marketingEmails: marketingEmails.value,
    },
  })
}
</script>

<template>
  <div class="flex h-[100svh] items-center justify-center px-4">
    <div class="w-full max-w-md">
      <!-- Sign-up Card -->
      <div class="rounded-border bg-surface p-8 shadow-lg">
        <!-- Header -->
        <div class="mb-8 text-center">
          <h1 class="text-2xl font-bold text-color">
            {{ T('title') }}
          </h1>
          <p class="mt-2 text-sm text-muted-color">
            {{ T('subtitle') }}
          </p>
        </div>

        <!-- Page-level Error Message (OAuth errors) -->
        <Message
          v-if="pageError"
          severity="error"
          class="mb-4"
        >
          {{ pageError }}
        </Message>

        <!-- Email Step -->
        <div
          v-if="step === 'email'"
          class="flex flex-col gap-4"
        >
          <!-- Terms and Conditions -->
          <div class="flex flex-col gap-3">
            <label
              class="flex cursor-pointer items-center gap-2 text-sm text-color"
              :class="{ 'animate-shake': shakeTerms }"
            >
              <Checkbox
                v-model="agreeToTerms"
                :binary="true"
              />
              <i18n-t keypath="pages.auth.sign-up.agreeToTerms">
                <template #termsOfService>
                  <WebLink
                    href="/legal/terms-of-service"
                    target="_blank"
                  >
                    {{ TTerms('title') }}
                  </WebLink>
                </template>
                <template #privacyPolicy>
                  <WebLink
                    href="/legal/privacy-policy"
                    target="_blank"
                  >
                    {{ TPrivacy('title') }}
                  </WebLink>
                </template>
              </i18n-t>
            </label>

            <label
              class="
                flex cursor-pointer items-center gap-2 text-sm text-muted-color
              "
            >
              <Checkbox
                v-model="marketingEmails"
                :binary="true"
              />
              {{ T('marketingEmailsLabel') }}
            </label>
          </div>

          <!-- Invite Code -->
          <div
            class="flex flex-col gap-1"
            :class="{ 'animate-shake': shakeInviteCode }"
          >
            <FormLabel
              htmlFor="inviteCode"
              :class="inviteCodeRequired ? '' : 'text-muted-color'"
            >
              {{ T('inviteCodeLabel') }}
              <span
                v-if="!inviteCodeRequired"
                class="font-normal"
              >
                ({{ TC('labels.optional') }})
              </span>
            </FormLabel>
            <Input
              id="inviteCode"
              v-model="formState.inviteCode"
              name="inviteCode"
              :placeholder="T('inviteCodePlaceholder')"
              :invalid="!!validationResult.inviteCode"
              @change="validateField('inviteCode')"
            />
            <FormError
              name="inviteCode"
              :errors="validationResult"
            />
          </div>

          <Divider class="my-3" />

          <div class="flex flex-col gap-1">
            <FormLabel htmlFor="email">
              {{ T('emailLabel') }}
            </FormLabel>
            <Input
              id="email"
              v-model="formState.email"
              name="email"
              type="email"
              autofill
              :placeholder="T('emailPlaceholder')"
              :invalid="!!validationResult.email"
              @focus="showTurnstile = true"
              @change="validateField('email')"
              @keyup.enter="sendCode"
            />
            <FormError
              name="email"
              :errors="validationResult"
            />
          </div>

          <!-- Turnstile CAPTCHA -->
          <div
            v-if="showTurnstile"
            class="flex justify-center"
          >
            <AppTurnstile
              ref="turnstileRef"
              v-model="turnstileToken"
            />
          </div>

          <Button
            :disabled="!canSubmit || isResendDisabled"
            :loading="loading"
            :label="isResendDisabled ? `${T('sendCode')} (${resendCountdown}s)` : T('sendCode')"
            class="w-full"
            @click="sendCode"
          />

          <Divider class="my-0">
            <span class="text-sm text-muted-color">
              {{ TC('labels.or') }}
            </span>
          </Divider>

          <!-- OAuth Buttons -->
          <div class="flex flex-col gap-3">
            <Button
              severity="secondary"
              outlined
              :disabled="loading"
              class="w-full"
              @click="signUpWithProvider('google')"
            >
              <IconGoogle :size="20" />
              {{ T('signUpWithGoogle') }}
            </Button>

            <Button
              severity="secondary"
              outlined
              :disabled="loading"
              class="w-full"
              @click="signUpWithProvider('github')"
            >
              <IconGitHub :size="20" />
              {{ T('signUpWithGithub') }}
            </Button>
          </div>

          <!-- Sign-in Link -->
          <p class="mt-6 text-center text-sm text-muted-color">
            {{ T('haveAccount') }}
            <WebLink
              href="/auth/sign-in"
              unstyled
              class="
                font-medium text-primary
                hover:underline
              "
            >
              {{ T('signIn') }}
            </WebLink>
          </p>
        </div>

        <!-- Code Verification Step -->
        <div
          v-else
          class="flex flex-col gap-4"
        >
          <div class="flex flex-col items-center gap-2">
            <FormLabel htmlFor="otp">
              {{ T('codeLabel') }}
            </FormLabel>
            <InputOtp
              v-model="formState.otp"
              :length="6"
              size="large"
              integerOnly
              @keyup.enter="verifyCode"
            />
            <FormError
              name="otp"
              :errors="validationResult"
            />
            <p class="text-xs text-muted-color">
              {{ T('codeHint', { email: formState.email }) }}
            </p>
          </div>

          <Button
            :disabled="formState.otp.length !== 6"
            :loading="loading"
            :label="T('createAccount')"
            class="w-full"
            @click="verifyCode"
          />

          <Button
            severity="secondary"
            text
            :label="T('changeEmail')"
            class="w-full"
            @click="resetToEmail"
          />
        </div>
      </div>
    </div>
  </div>
</template>
