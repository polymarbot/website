<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  title: 'pages.auth.sign-in.name',
})

const T = useTranslations('pages.auth.sign-in')
const TC = useTranslations('common')
const route = useRoute()
const { sendSignInOtp, verifySignInOtp, signInWithOAuth, resolveOAuthError } = useAuthActions()

// Step state
const step = ref<'email' | 'code'>('email')
const loading = ref(false)

// Resend countdown timer
const { remaining: resendCountdown, isActive: isResendDisabled, start: startResendCountdown } = useCountdown({ duration: 60 })

// Turnstile component ref for reset functionality
const turnstileRef = ref<{ reset: () => void } | null>(null)
const turnstileToken = ref('')
const showTurnstile = ref(false)

// Page-level error message (for OAuth errors from URL)
const pageError = ref('')

// Form state
const formState = reactive({
  email: '',
  otp: '',
})

// Dynamic schema based on current step
const schema = computed(() => {
  if (step.value === 'email') {
    return createApiValidationSchema('POST', '/api/auth/email-otp-signin/send-otp')
      .omit({ turnstileToken: true }) // Turnstile is validated separately
  }
  return createApiValidationSchema('POST', '/api/auth/email-otp-signin/verify-otp')
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
    pageError.value = resolveOAuthError(rawErrorCode)
  }
})

// Check if form is valid for submission
const canSubmit = computed(() => {
  return !!formState.email && !!turnstileToken.value
})

// Send verification code
async function sendCode () {
  if (!canSubmit.value || loading.value) return

  try {
    await validate([ 'email' ])
  } catch {
    return
  }

  loading.value = true
  const success = await sendSignInOtp({
    email: formState.email,
    turnstileToken: turnstileToken.value,
  })
  loading.value = false

  if (success) {
    step.value = 'code'
    startResendCountdown()
  } else {
    turnstileRef.value?.reset()
  }
}

// Verify code and sign in
async function verifyCode () {
  if (!formState.otp || loading.value) return

  try {
    await validate([ 'otp' ])
  } catch {
    return
  }

  loading.value = true
  const success = await verifySignInOtp({
    email: formState.email,
    otp: formState.otp,
  })
  loading.value = false

  if (success) {
    await navigateTo('/dashboard')
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

// OAuth sign-in
async function signInWithProvider (provider: 'google' | 'github') {
  await signInWithOAuth(provider, { errorCallbackURL: '/auth/sign-in' })
}
</script>

<template>
  <div class="flex h-svh items-center justify-center px-4">
    <div class="w-full max-w-md">
      <!-- Sign-in Card -->
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
            :label="T('verify')"
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

        <!-- Divider -->
        <Divider class="my-6">
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
            @click="signInWithProvider('google')"
          >
            <IconGoogle :size="20" />
            {{ T('signInWithGoogle') }}
          </Button>

          <Button
            severity="secondary"
            outlined
            :disabled="loading"
            class="w-full"
            @click="signInWithProvider('github')"
          >
            <IconGitHub :size="20" />
            {{ T('signInWithGithub') }}
          </Button>
        </div>

        <!-- Sign-up Link -->
        <p class="mt-6 text-center text-sm text-muted-color">
          {{ T('noAccount') }}
          <WebLink
            href="/auth/sign-up"
            unstyled
            class="
              font-medium text-primary
              hover:underline
            "
          >
            {{ T('signUp') }}
          </WebLink>
        </p>
      </div>
    </div>
  </div>
</template>
