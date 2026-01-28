/**
 * Shared utilities for Email OTP authentication
 */

import crypto from 'node:crypto'
import { APIError } from 'better-auth'

// ============================================================================
// OTP Generation & Encoding
// ============================================================================

/**
 * Generate cryptographically secure numeric OTP
 */
export function generateOTP (length: number): string {
  const min = Math.pow(10, length - 1)
  const max = Math.pow(10, length)
  return crypto.randomInt(min, max).toString()
}

/**
 * Calculate expiration date from seconds
 */
export function calculateExpiresAt (expiresInSeconds: number): Date {
  return new Date(Date.now() + expiresInSeconds * 1000)
}

/**
 * Encode OTP value with attempt counter
 * Format: {otp}:{attemptCount}
 */
export function encodeVerificationValue (otp: string, attemptCount: number = 0): string {
  return `${otp}:${attemptCount}`
}

/**
 * Decode OTP value to extract code and attempt count
 */
export function decodeVerificationValue (value: string): { otp: string, attemptCount: number } {
  const parts = value.split(':')
  return {
    otp: parts[0] ?? '',
    attemptCount: parseInt(parts[1] ?? '0', 10),
  }
}

// ============================================================================
// Request Helpers
// ============================================================================

/**
 * Context type for auth endpoint handlers
 */
interface AuthContext {
  request?: {
    headers: {
      get: (name: string) => string | null
    }
  }
}

/**
 * Extract client IP from request headers
 */
export function extractClientIP (ctx: AuthContext): string {
  return ctx.request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || ctx.request?.headers.get('x-real-ip')
    || 'unknown'
}

// ============================================================================
// Security Verification
// ============================================================================

/**
 * Verify Turnstile token and check rate limits
 */
export async function verifyTurnstileAndRateLimit (
  turnstileToken: string,
  email: string,
  clientIP: string,
): Promise<void> {
  const turnstileResult = await verifyTurnstileToken(turnstileToken)
  if (!turnstileResult.success) {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.AUTH_TURNSTILE_FAILED,
      code: ERROR_CODES.AUTH_TURNSTILE_FAILED,
    })
  }

  const ipRateLimitResult = await otpIpRateLimiter.check(clientIP)
  if (!ipRateLimitResult.allowed) {
    throw new APIError('TOO_MANY_REQUESTS', {
      message: ERROR_CODES.AUTH_OTP_IP_RATE_LIMITED,
      code: ERROR_CODES.AUTH_OTP_IP_RATE_LIMITED,
    })
  }

  const emailRateLimitResult = await otpEmailRateLimiter.check(email)
  if (!emailRateLimitResult.allowed) {
    throw new APIError('TOO_MANY_REQUESTS', {
      message: ERROR_CODES.AUTH_OTP_EMAIL_RATE_LIMITED,
      code: ERROR_CODES.AUTH_OTP_EMAIL_RATE_LIMITED,
    })
  }
}

/**
 * Record rate limit usage after successful OTP send
 */
export async function recordRateLimitUsage (email: string, clientIP: string): Promise<void> {
  await otpIpRateLimiter.record(clientIP)
  await otpEmailRateLimiter.record(email)
}

// ============================================================================
// OTP Verification Storage
// ============================================================================

/**
 * Store OTP verification record
 */
export async function storeVerification (
  identifier: string,
  otp: string,
  expiresAt: Date,
): Promise<void> {
  await db.verification.deleteMany({
    where: {
      OR: [{ identifier }, { expiresAt: { lt: new Date() }}],
    },
  })

  await db.verification.create({
    data: {
      identifier,
      value: encodeVerificationValue(otp, 0),
      expiresAt,
    },
  })
}

/**
 * Verify OTP code and delete verification record on success
 */
export async function verifyOtpCode (
  identifier: string,
  otp: string,
  otpLength: number,
  allowedAttempts: number,
): Promise<void> {
  if (otp.length !== otpLength) {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.AUTH_INVALID_VERIFICATION_CODE,
      code: ERROR_CODES.AUTH_INVALID_VERIFICATION_CODE,
    })
  }

  const verification = await db.verification.findFirst({
    where: { identifier },
  })

  if (!verification) {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.AUTH_INVALID_VERIFICATION_CODE,
      code: ERROR_CODES.AUTH_INVALID_VERIFICATION_CODE,
    })
  }

  if (verification.expiresAt < new Date()) {
    await db.verification.delete({ where: { id: verification.id }})
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.AUTH_VERIFICATION_CODE_EXPIRED,
      code: ERROR_CODES.AUTH_VERIFICATION_CODE_EXPIRED,
    })
  }

  const { otp: storedOtp, attemptCount } = decodeVerificationValue(verification.value)

  if (attemptCount >= allowedAttempts) {
    await db.verification.delete({ where: { id: verification.id }})
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.AUTH_VERIFICATION_CODE_EXPIRED,
      code: ERROR_CODES.AUTH_VERIFICATION_CODE_EXPIRED,
    })
  }

  if (storedOtp !== otp) {
    await db.verification.update({
      where: { id: verification.id },
      data: { value: encodeVerificationValue(storedOtp, attemptCount + 1) },
    })
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.AUTH_INVALID_VERIFICATION_CODE,
      code: ERROR_CODES.AUTH_INVALID_VERIFICATION_CODE,
    })
  }

  await db.verification.delete({ where: { id: verification.id }})
}
