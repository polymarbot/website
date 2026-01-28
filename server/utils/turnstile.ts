/**
 * Cloudflare Turnstile Server-side Verification
 *
 * Verifies Turnstile tokens by calling Cloudflare's siteverify API.
 * @see https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export interface TurnstileVerifyResponse {
  'success': boolean
  'error-codes'?: string[]
  'challenge_ts'?: string
  'hostname'?: string
  'action'?: string
  'cdata'?: string
}

/**
 * Verify a Turnstile token with Cloudflare's API
 *
 * @param token - The token from the client-side Turnstile widget
 * @param remoteIp - Optional client IP address for additional validation
 * @returns Verification result from Cloudflare
 */
export async function verifyTurnstileToken (
  token: string,
  remoteIp?: string,
): Promise<TurnstileVerifyResponse> {
  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY

  if (!secretKey) {
    console.error('Turnstile secret key is not configured')
    return { 'success': false, 'error-codes': [ 'missing-secret-key' ]}
  }

  const formData = new URLSearchParams()
  formData.append('secret', secretKey)
  formData.append('response', token)
  if (remoteIp) {
    formData.append('remoteip', remoteIp)
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    })

    if (!response.ok) {
      console.error('Turnstile verification request failed:', response.status)
      return { 'success': false, 'error-codes': [ 'request-failed' ]}
    }

    return await response.json() as TurnstileVerifyResponse
  } catch (error) {
    console.error('Turnstile verification error:', error)
    return { 'success': false, 'error-codes': [ 'network-error' ]}
  }
}
