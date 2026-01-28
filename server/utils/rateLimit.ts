/**
 * Rate Limiting Utility
 *
 * Provides fine-grained rate limiting using Nitro's LRU cache storage.
 * Uses dedicated 'rateLimit' storage mount point for isolation from cache data.
 */

interface RateLimitConfig {
  /** Maximum number of requests allowed */
  maxRequests: number
  /** Time window in seconds */
  windowSeconds: number
}

interface RateLimitRecord {
  count: number
  windowStart: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInSeconds: number
}

/**
 * Create a rate limiter for a specific namespace
 *
 * @param namespace - Unique namespace for this rate limiter (e.g., 'otp-email', 'otp-ip')
 * @param config - Rate limit configuration
 * @returns Rate limiter functions
 */
export function createRateLimiter (namespace: string, config: RateLimitConfig) {
  const { maxRequests, windowSeconds } = config
  const storage = useStorage<RateLimitRecord>(`rateLimit:${namespace}`)

  /**
   * Check rate limit for a given key
   *
   * @param key - Unique identifier (e.g., email address, IP address)
   * @returns Rate limit check result
   */
  async function check (key: string): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000)
    const record = await storage.getItem(key)

    // No existing record, allow the request
    if (!record) {
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetInSeconds: windowSeconds,
      }
    }

    // Check if window has expired
    const windowEnd = record.windowStart + windowSeconds
    if (now >= windowEnd) {
      // Window expired, start a new one
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetInSeconds: windowSeconds,
      }
    }

    // Window still active, check count
    if (record.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: windowEnd - now,
      }
    }

    return {
      allowed: true,
      remaining: maxRequests - record.count - 1,
      resetInSeconds: windowEnd - now,
    }
  }

  /**
   * Record a request for rate limiting
   *
   * @param key - Unique identifier (e.g., email address, IP address)
   */
  async function record (key: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000)
    const existing = await storage.getItem(key)

    if (!existing || now >= existing.windowStart + windowSeconds) {
      // Start new window
      await storage.setItem(key, {
        count: 1,
        windowStart: now,
      })
    } else {
      // Increment count in existing window
      await storage.setItem(key, {
        count: existing.count + 1,
        windowStart: existing.windowStart,
      })
    }
  }

  return {
    check,
    record,
  }
}

// Pre-configured rate limiters for common use cases

/**
 * Rate limiter for OTP email sending per email address
 * Limit: 1 request per 60 seconds per email
 */
export const otpEmailRateLimiter = createRateLimiter('otp-email', {
  maxRequests: 1,
  windowSeconds: 60,
})

/**
 * Rate limiter for OTP requests per IP address
 * Limit: 5 requests per 60 seconds per IP
 */
export const otpIpRateLimiter = createRateLimiter('otp-ip', {
  maxRequests: 5,
  windowSeconds: 60,
})
