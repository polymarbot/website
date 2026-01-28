import type { FetchError } from 'ofetch'
import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack'
import type { VNode } from 'vue'

type RequestBody = BodyInit | Record<string, unknown> | null | undefined

/**
 * Custom error message function type
 * - Return a string/VNode/HTMLElement to display custom message
 * - Return empty string ('') to suppress the default error modal (caller handles it)
 * - Return undefined to use default error handling
 */
export type CustomErrorMessageFn = (error: FetchError) => string | VNode | HTMLElement | undefined

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Extended fetch options with custom error message support
 */
export interface RequestOptions extends Omit<NitroFetchOptions<NitroFetchRequest>, 'method' | 'body'> {
  customErrorMessage?: CustomErrorMessageFn
  method?: HttpMethod
  body?: RequestBody
}

/**
 * Request function type with HTTP method shortcuts
 */
export interface RequestFn {
  <T>(url: string, options?: RequestOptions): Promise<T>
  get: <T>(url: string, options?: Omit<RequestOptions, 'body'>) => Promise<T>
  post: <T>(url: string, body?: RequestBody, options?: Omit<RequestOptions, 'body'>) => Promise<T>
  put: <T>(url: string, body?: RequestBody, options?: Omit<RequestOptions, 'body'>) => Promise<T>
  patch: <T>(url: string, body?: RequestBody, options?: Omit<RequestOptions, 'body'>) => Promise<T>
  delete: <T>(url: string, options?: RequestOptions) => Promise<T>
}

/**
 * Get error message from fetch error with custom message support
 * Priority: customErrorMessage > getErrorMessage utility
 */
function resolveErrorMessage (
  error: FetchError,
  customErrorMessage: CustomErrorMessageFn | undefined,
  t: ReturnType<typeof useI18n>['t'],
  te: ReturnType<typeof useI18n>['te'],
): string | VNode | HTMLElement {
  // Try custom error message function first
  if (customErrorMessage) {
    const customMessage = customErrorMessage(error)
    // Return custom message if defined (including empty string to suppress modal)
    if (customMessage !== undefined) {
      return customMessage
    }
  }

  // Use centralized error message utility
  return getErrorMessage(error.data || error, t, te)
}

/**
 * Request composable
 * Provides a configured $fetch instance with interceptors for auth, i18n, and error handling
 */
export function useRequest (): RequestFn {
  const { loggedIn, signOut } = useAuth()
  const { locale, t, te } = useI18n()
  const dialog = useDialog()

  /**
   * Base request function with interceptors
   */
  async function request<T> (url: string, options?: RequestOptions): Promise<T> {
    const { customErrorMessage, ...fetchOptions } = options ?? {}

    try {
      const result = await $fetch(url, {
        ...fetchOptions,

        retry: 1,
        retryDelay: 3000,
        retryStatusCodes: [
          408, // Request Timeout
          429, // Too Many Requests
        ],

        // Request interceptor
        onRequest ({ options }) {
          const headers = new Headers(options.headers)

          // Add Accept-Language header
          if (locale.value) {
            headers.set('Accept-Language', locale.value)
          }

          options.headers = headers
        },

        // Response error handler (only for 401, error dialog is shown in catch block after all retries)
        async onResponseError ({ response }) {
          // Handle 401 Unauthorized - redirect to sign-in
          if (response.status === 401) {
            if (loggedIn.value) {
              await signOut()
            }

            // Redirect to sign-in page if not already there
            const currentRouteName = useRoute().name
            if (currentRouteName !== 'auth-sign-in') {
              await navigateTo('/auth/sign-in')
            }
          }
        },
      } as NitroFetchOptions<NitroFetchRequest>)

      return result as T
    } catch (err) {
      const error = err as FetchError

      // Show error dialog after all retries failed (skip if empty string to suppress modal)
      const errorMessage = resolveErrorMessage(error, customErrorMessage, t, te)
      if (errorMessage) {
        dialog.alert({
          message: errorMessage,
          header: t('common.labels.error'),
          type: 'danger',
        })
      }

      throw error
    }
  }

  // Attach HTTP method shortcuts
  request.get = <T>(url: string, options?: Omit<RequestOptions, 'body'>) =>
    request<T>(url, { ...options, method: 'GET' } as RequestOptions)

  request.post = <T>(url: string, body?: RequestBody, options?: Omit<RequestOptions, 'body'>) =>
    request<T>(url, { ...options, method: 'POST', body } as RequestOptions)

  request.put = <T>(url: string, body?: RequestBody, options?: Omit<RequestOptions, 'body'>) =>
    request<T>(url, { ...options, method: 'PUT', body } as RequestOptions)

  request.patch = <T>(url: string, body?: RequestBody, options?: Omit<RequestOptions, 'body'>) =>
    request<T>(url, { ...options, method: 'PATCH', body } as RequestOptions)

  request.delete = <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'DELETE' } as RequestOptions)

  return request as RequestFn
}
