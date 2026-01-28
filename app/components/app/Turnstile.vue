<script setup lang="ts">
/**
 * Turnstile Component
 *
 * A custom implementation of Cloudflare Turnstile widget.
 * Loads the Turnstile script and renders the challenge widget.
 *
 * @see https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
 */

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
    onTurnstileLoad?: () => void
  }
}

interface TurnstileRenderOptions {
  'sitekey': string
  'callback'?: (token: string) => void
  'error-callback'?: () => void
  'expired-callback'?: () => void
  'theme'?: 'light' | 'dark' | 'auto'
  'size'?: 'normal' | 'compact'
}

export interface TurnstileProps {
  /** The model value for the Turnstile token */
  modelValue?: string
  /** Theme for the widget */
  theme?: 'light' | 'dark' | 'auto'
  /** Size of the widget */
  size?: 'normal' | 'compact'
}

const props = withDefaults(defineProps<TurnstileProps>(), {
  modelValue: '',
  theme: 'auto',
  size: 'normal',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const runtimeConfig = useRuntimeConfig()
const siteKey = runtimeConfig.public.turnstileSiteKey

const containerRef = ref<HTMLDivElement | null>(null)
const widgetId = ref<string | null>(null)
const isScriptLoaded = ref(false)

/**
 * Render the Turnstile widget
 */
function renderWidget () {
  if (!window.turnstile || !containerRef.value || !siteKey) return

  // Remove existing widget if any
  if (widgetId.value) {
    window.turnstile.remove(widgetId.value)
    widgetId.value = null
  }

  widgetId.value = window.turnstile.render(containerRef.value, {
    'sitekey': siteKey,
    'theme': props.theme,
    'size': props.size,
    'callback': (token: string) => {
      emit('update:modelValue', token)
    },
    'error-callback': () => {
      emit('update:modelValue', '')
    },
    'expired-callback': () => {
      emit('update:modelValue', '')
    },
  })
}

/**
 * Reset the Turnstile widget
 * Call this when an error occurs and you need the user to re-verify
 */
function reset () {
  if (window.turnstile && widgetId.value) {
    window.turnstile.reset(widgetId.value)
  }
  emit('update:modelValue', '')
}

/**
 * Load the Turnstile script
 */
function loadScript () {
  if (isScriptLoaded.value || document.getElementById('turnstile-script')) {
    // Script already loaded or loading
    if (window.turnstile) {
      renderWidget()
    }
    return
  }

  // Set callback before loading script
  window.onTurnstileLoad = () => {
    isScriptLoaded.value = true
    renderWidget()
  }

  const script = document.createElement('script')
  script.id = 'turnstile-script'
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
  script.async = true
  script.defer = true
  document.head.appendChild(script)
}

onMounted(() => {
  if (siteKey) {
    loadScript()
  } else {
    console.error('Turnstile site key is not configured')
  }
})

onUnmounted(() => {
  if (window.turnstile && widgetId.value) {
    window.turnstile.remove(widgetId.value)
  }
})

// Expose the reset method to parent components
defineExpose({ reset })
</script>

<template>
  <div ref="containerRef" />
</template>
