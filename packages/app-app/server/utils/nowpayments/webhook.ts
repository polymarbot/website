/**
 * NOWPayments IPN (Instant Payment Notification) Utilities
 *
 * Handles IPN signature verification and event parsing.
 * NOWPayments uses HMAC-SHA512 with sorted JSON keys for signature generation.
 *
 * @see https://documenter.getpostman.com/view/7907941/2s93JwMgmb#ipn-callbacks
 */

import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * NOWPayments payment status values
 */
export type NowPaymentsStatus
  = | 'waiting'
    | 'confirming'
    | 'confirmed'
    | 'sending'
    | 'partially_paid'
    | 'finished'
    | 'failed'
    | 'refunded'
    | 'expired'

/**
 * NOWPayments IPN callback payload
 */
export interface NowPaymentsIpnEvent {
  payment_id: number
  invoice_id: number
  payment_status: NowPaymentsStatus
  pay_address: string
  payin_extra_id: string | null
  price_amount: number
  price_currency: string
  pay_amount: number
  actually_paid: number
  pay_currency: string
  order_id: string
  order_description: string
  purchase_id: number
  outcome_amount: number
  outcome_currency: string
  created_at: string
  updated_at: string
}

/**
 * Get IPN secret from environment
 */
function getIpnSecret (): string {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET
  if (!secret) {
    throw new Error('NOWPAYMENTS_IPN_SECRET environment variable is not set')
  }
  return secret
}

/**
 * Sort object keys alphabetically (recursive)
 * NOWPayments requires sorted JSON for signature verification
 */
function sortObject (obj: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(obj).sort().reduce<Record<string, unknown>>((sorted, key) => {
    const value = obj[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sorted[key] = sortObject(value as Record<string, unknown>)
    } else {
      sorted[key] = value
    }
    return sorted
  }, {})
}

/**
 * Verify IPN signature
 *
 * NOWPayments signs IPN callbacks using HMAC-SHA512.
 * The payload must be sorted by key alphabetically before hashing.
 *
 * @param payload - The parsed IPN payload object
 * @param signature - The signature from x-nowpayments-sig header
 * @returns true if signature is valid
 */
export function verifyIpnSignature (payload: Record<string, unknown>, signature: string): boolean {
  const secret = getIpnSecret()

  const sortedPayload = sortObject(payload)
  const sortedJson = JSON.stringify(sortedPayload)

  const expectedSignature = createHmac('sha512', secret)
    .update(sortedJson)
    .digest('hex')

  return expectedSignature.length === signature.length
    && timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))
}

/**
 * Parse and verify IPN event
 *
 * @param rawBody - The raw request body as string
 * @param signature - The signature from x-nowpayments-sig header
 * @returns Parsed IPN event or null if verification fails
 */
export function parseIpnEvent (rawBody: string, signature: string): NowPaymentsIpnEvent | null {
  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch (error) {
    console.error('Failed to parse NOWPayments IPN event:', error)
    return null
  }

  if (!verifyIpnSignature(payload, signature)) {
    console.error('NOWPayments IPN signature verification failed')
    return null
  }

  return payload as unknown as NowPaymentsIpnEvent
}
