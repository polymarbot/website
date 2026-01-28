/**
 * Coinbase Commerce Webhook Utilities
 *
 * Handles webhook signature verification and event parsing.
 * @see https://docs.cloud.coinbase.com/commerce-onchain/docs/webhooks
 */

import { createHmac } from 'node:crypto'

/**
 * Coinbase Commerce Webhook Event Types
 */
export type CoinbaseWebhookEventType
  = | 'charge:created'
    | 'charge:confirmed'
    | 'charge:failed'
    | 'charge:delayed'
    | 'charge:pending'
    | 'charge:resolved'

/**
 * Coinbase Webhook Event Structure
 */
export interface CoinbaseWebhookEvent {
  id: string
  type: CoinbaseWebhookEventType
  api_version: string
  created_at: string
  data: {
    id: string
    code: string
    name: string
    description: string
    hosted_url: string
    pricing: {
      local: {
        amount: string
        currency: string
      }
    }
    metadata?: Record<string, string>
    timeline: Array<{
      status: string
      time: string
    }>
    payments: Array<{
      network: string
      transaction_id: string
      status: string
      value: {
        local: { amount: string, currency: string }
        crypto: { amount: string, currency: string }
      }
    }>
  }
}

/**
 * Get webhook secret from environment
 */
function getWebhookSecret (): string {
  const secret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error('COINBASE_COMMERCE_WEBHOOK_SECRET environment variable is not set')
  }
  return secret
}

/**
 * Verify webhook signature
 *
 * Coinbase signs webhooks using HMAC-SHA256 with your webhook shared secret.
 * The signature is included in the X-CC-Webhook-Signature header.
 *
 * @param rawBody - The raw request body as string
 * @param signature - The signature from X-CC-Webhook-Signature header
 * @returns true if signature is valid
 */
export function verifyWebhookSignature (rawBody: string, signature: string): boolean {
  const secret = getWebhookSecret()

  const expectedSignature = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  return expectedSignature === signature
}

/**
 * Parse and verify webhook event
 *
 * @param rawBody - The raw request body as string
 * @param signature - The signature from X-CC-Webhook-Signature header
 * @returns Parsed webhook event or null if verification fails
 */
export function parseWebhookEvent (rawBody: string, signature: string): CoinbaseWebhookEvent | null {
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('Coinbase webhook signature verification failed')
    return null
  }

  try {
    const event: { event: CoinbaseWebhookEvent } = JSON.parse(rawBody)
    return event.event
  } catch (error) {
    console.error('Failed to parse Coinbase webhook event:', error)
    return null
  }
}
