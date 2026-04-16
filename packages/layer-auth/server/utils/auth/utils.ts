/**
 * Shared utilities for Email OTP authentication
 */

import crypto from 'node:crypto'
import { APIError } from 'better-auth'
import { ERROR_CODES } from '../../errors'

// ============================================================================
// OTP Rate Limiters
// ============================================================================

/**
 * Rate limiter for OTP email sending per email address
 * Limit: 1 request per 60 seconds per email
 */
const otpEmailRateLimiter = createRateLimiter('otp-email', {
  maxRequests: 1,
  windowSeconds: 60,
})

/**
 * Rate limiter for OTP requests per IP address
 * Limit: 5 requests per 60 seconds per IP
 */
const otpIpRateLimiter = createRateLimiter('otp-ip', {
  maxRequests: 5,
  windowSeconds: 60,
})

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
// OTP Verification Storage (using better-auth internalAdapter)
// ============================================================================

/** Auth context type with internalAdapter access */
export interface InternalAdapterContext {
  context: {
    internalAdapter: {
      createVerificationValue: (data: { identifier: string, value: string, expiresAt: Date }) => Promise<unknown>
      findVerificationValue: (identifier: string) => Promise<{ id: string, identifier: string, value: string, expiresAt: Date } | null>
      updateVerificationByIdentifier: (identifier: string, data: { value?: string }) => Promise<unknown>
      deleteVerificationByIdentifier: (identifier: string) => Promise<unknown>
    }
  }
}

/**
 * Store OTP verification record
 */
export async function storeVerification (
  ctx: InternalAdapterContext,
  identifier: string,
  otp: string,
  expiresAt: Date,
): Promise<void> {
  const adapter = ctx.context.internalAdapter

  // Delete existing verification for this identifier (if any)
  const existing = await adapter.findVerificationValue(identifier)
  if (existing) {
    await adapter.deleteVerificationByIdentifier(identifier)
  }

  await adapter.createVerificationValue({
    identifier,
    value: encodeVerificationValue(otp, 0),
    expiresAt,
  })
}

/**
 * Verify OTP code and delete verification record on success
 */
export async function verifyOtpCode (
  ctx: InternalAdapterContext,
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

  const adapter = ctx.context.internalAdapter
  const verification = await adapter.findVerificationValue(identifier)

  if (!verification) {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.AUTH_INVALID_VERIFICATION_CODE,
      code: ERROR_CODES.AUTH_INVALID_VERIFICATION_CODE,
    })
  }

  if (verification.expiresAt < new Date()) {
    await adapter.deleteVerificationByIdentifier(identifier)
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.AUTH_VERIFICATION_CODE_EXPIRED,
      code: ERROR_CODES.AUTH_VERIFICATION_CODE_EXPIRED,
    })
  }

  const { otp: storedOtp, attemptCount } = decodeVerificationValue(verification.value)

  if (attemptCount >= allowedAttempts) {
    await adapter.deleteVerificationByIdentifier(identifier)
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.AUTH_VERIFICATION_CODE_EXPIRED,
      code: ERROR_CODES.AUTH_VERIFICATION_CODE_EXPIRED,
    })
  }

  if (storedOtp !== otp) {
    await adapter.updateVerificationByIdentifier(identifier, {
      value: encodeVerificationValue(storedOtp, attemptCount + 1),
    })
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.AUTH_INVALID_VERIFICATION_CODE,
      code: ERROR_CODES.AUTH_INVALID_VERIFICATION_CODE,
    })
  }

  await adapter.deleteVerificationByIdentifier(identifier)
}

// ============================================================================
// Invite Code
// ============================================================================

/** Minimal db client shape for invite code operations */
export interface InviteDbClient {
  inviteCode: {
    findUnique: (args: any) => Promise<any>
    update: (args: any) => Promise<any>
  }
  inviteRecord: {
    create: (args: any) => Promise<any>
  }
}

/**
 * Check if invite code is required based on environment variable
 */
export function isInviteCodeRequired (): boolean {
  return process.env.INVITE_CODE_REQUIRED === 'true'
}

/**
 * Validate invite code existence and availability
 * Throws APIError if validation fails
 */
export async function validateInviteCode (db: InviteDbClient, inviteCode?: string): Promise<void> {
  if (isInviteCodeRequired() && !inviteCode) {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.INVITE_CODE_REQUIRED,
      code: ERROR_CODES.INVITE_CODE_REQUIRED,
    })
  }

  if (!inviteCode) return

  const record = await db.inviteCode.findUnique({
    where: { code: inviteCode },
  })

  if (!record) {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.INVITE_CODE_INVALID,
      code: ERROR_CODES.INVITE_CODE_INVALID,
    })
  }

  if (record.expiresAt && record.expiresAt < new Date()) {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.INVITE_CODE_EXPIRED,
      code: ERROR_CODES.INVITE_CODE_EXPIRED,
    })
  }

  if (record.maxUses !== null && record.usedCount >= record.maxUses) {
    throw new APIError('BAD_REQUEST', {
      message: ERROR_CODES.INVITE_CODE_USAGE_EXCEEDED,
      code: ERROR_CODES.INVITE_CODE_USAGE_EXCEEDED,
    })
  }
}

/**
 * Record invite code usage after successful registration
 */
export async function recordInviteCodeUsage (
  db: InviteDbClient,
  inviteCode: string,
  userId: string,
): Promise<void> {
  await db.inviteRecord.create({
    data: { inviteCode, userId },
  })

  await db.inviteCode.update({
    where: { code: inviteCode },
    data: { usedCount: { increment: 1 } },
  })
}
