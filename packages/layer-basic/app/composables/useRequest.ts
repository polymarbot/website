import type { FetchError } from 'ofetch'
import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack'
import type { VNode } from 'vue'

// ============================================================================
// Types
// ============================================================================

type RequestBody = BodyInit | Record<string, unknown> | null | undefined
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Custom error message function type
 * - Return a string/VNode/HTMLElement to display custom message
 * - Return empty string ('') to suppress the default error modal (caller handles it)
 * - Return undefined to use default error handling
 */
export type CustomErrorMessageFn = (error: FetchError) => string | VNode | HTMLElement | undefined

export interface RequestCacheOptions {
  /** Time-to-live in milliseconds */
  ttl: number
  /** Custom cache key (defaults to URL + sorted query params) */
  key?: string
}

export interface RequestOptions extends Omit<NitroFetchOptions<NitroFetchRequest>, 'method' | 'body'> {
  customErrorMessage?: CustomErrorMessageFn
  method?: HttpMethod
  body?: RequestBody
  /**
   * Memory cache for GET requests.
   * - Default: `{ ttl: 10_000 }` — all GET requests are cached for 10s by default
   * - Custom TTL: `{ ttl: 3_600_000 }` — override TTL for specific requests
   * - Disable: `false` — skip cache for this request
   */
  memoryCache?: RequestCacheOptions | false
}

export interface RequestFn {
  <T>(url: string, options?: RequestOptions): Promise<T>
  get: <T>(url: string, options?: Omit<RequestOptions, 'body'>) => Promise<T>
  post: <T>(url: string, body?: RequestBody, options?: Omit<RequestOptions, 'body'>) => Promise<T>
  put: <T>(url: string, body?: RequestBody, options?: Omit<RequestOptions, 'body'>) => Promise<T>
  patch: <T>(url: string, body?: RequestBody, options?: Omit<RequestOptions, 'body'>) => Promise<T>
  delete: <T>(url: string, options?: RequestOptions) => Promise<T>
  /** Invalidate cached responses. Pass a URL prefix to clear matching entries, or omit to clear all. */
  invalidateCache: (urlPrefix?: string) => void
}

// ============================================================================
// Memory Cache
// ============================================================================

interface CacheEntry {
  data: unknown
  expiresAt: number
}

const DEFAULT_CACHE_TTL = 10 * 1000
const cacheStore = new Map<string, CacheEntry>()
const pendingRequests = new Map<string, Promise<unknown>>()

function generateCacheKey (url: string, query?: Record<string, unknown>): string {
  if (!query || Object.keys(query).length === 0) return url

  const sorted = Object.entries(query)
    .filter(([ , v ]) => v !== undefined && v !== null)
    .sort(([ a ], [ b ]) => a.localeCompare(b))
    .map(([ k, v ]) => `${k}=${String(v)}`)
    .join('&')

  return sorted ? `${url}?${sorted}` : url
}

function matchCacheKey (key: string, prefix: string): boolean {
  return key === prefix || key.startsWith(`${prefix}?`) || key.startsWith(`${prefix}/`)
}

function clearMapByPrefix (map: Map<string, unknown>, prefix?: string): void {
  if (!prefix) {
    map.clear()
    return
  }
  for (const key of map.keys()) {
    if (matchCacheKey(key, prefix)) {
      map.delete(key)
    }
  }
}

/**
 * Invalidate cached responses
 * @param urlPrefix - If provided, invalidate entries matching this URL prefix (including sub-paths). Otherwise, clear all.
 */
function invalidateRequestCache (urlPrefix?: string): void {
  clearMapByPrefix(cacheStore, urlPrefix)
  clearMapByPrefix(pendingRequests, urlPrefix)
}

// ============================================================================
// Error Handling
// ============================================================================

function resolveErrorMessage (
  error: FetchError,
  customErrorMessage: CustomErrorMessageFn | undefined,
  i18n: { t: ReturnType<typeof useI18n>['t'], te: ReturnType<typeof useI18n>['te'] },
): string | VNode | HTMLElement {
  if (customErrorMessage) {
    const customMessage = customErrorMessage(error)
    if (customMessage !== undefined) {
      return customMessage
    }
  }
  return getErrorMessage(error.data || error, i18n)
}

// ============================================================================
// Composable
// ============================================================================

/**
 * Request composable
 * Provides a configured $fetch instance with interceptors for auth, i18n, and error handling
 */
export function useRequest (): RequestFn {
  const { loggedIn, signOut } = useAuth()
  const { locale, t, te } = useI18n()
  const dialog = useDialog()

  async function doFetch<T> (
    url: string,
    fetchOptions: Record<string, unknown>,
    customErrorMessage?: CustomErrorMessageFn,
  ): Promise<T> {
    try {
      const result = await $fetch(url, {
        ...fetchOptions,

        retry: 1,
        retryDelay: 3000,
        retryStatusCodes: [
          408, // Request Timeout
          429, // Too Many Requests
        ],

        onRequest ({ options }) {
          const headers = new Headers(options.headers)
          if (locale.value) {
            headers.set('Accept-Language', locale.value)
          }
          headers.set('X-Timezone', Intl.DateTimeFormat().resolvedOptions().timeZone)
          options.headers = headers
        },

        async onResponseError ({ response }) {
          if (response.status === 401) {
            if (loggedIn.value) {
              await signOut()
            }
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
      const errorMessage = resolveErrorMessage(error, customErrorMessage, { t, te })
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

  async function request<T> (url: string, options?: RequestOptions): Promise<T> {
    const { customErrorMessage, memoryCache, ...fetchOptions } = options ?? {}
    const method = options?.method ?? 'GET'

    // Resolve cache options: GET defaults to 10s TTL, `false` disables, object overrides
    const cacheOptions = method === 'GET' && memoryCache !== false
      ? (memoryCache ?? { ttl: DEFAULT_CACHE_TTL })
      : null

    if (import.meta.client && cacheOptions) {
      const cacheKey = cacheOptions.key ?? generateCacheKey(url, fetchOptions.query as Record<string, unknown> | undefined)

      const cached = cacheStore.get(cacheKey)
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data as T
      }

      const pending = pendingRequests.get(cacheKey)
      if (pending) {
        return pending as Promise<T>
      }

      const promise = doFetch<T>(url, fetchOptions, customErrorMessage)
        .then(result => {
          cacheStore.set(cacheKey, {
            data: result,
            expiresAt: Date.now() + cacheOptions.ttl,
          })
          return result
        })
        .finally(() => {
          pendingRequests.delete(cacheKey)
        })

      pendingRequests.set(cacheKey, promise)
      return promise
    }

    return doFetch<T>(url, fetchOptions, customErrorMessage)
  }

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

  request.invalidateCache = invalidateRequestCache

  return request as RequestFn
}
