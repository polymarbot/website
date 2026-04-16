/**
 * NOWPayments API Client
 *
 * Handles communication with NOWPayments API for cryptocurrency payments.
 * Automatically switches between sandbox and production environments based on APP_ENV.
 *
 * @see https://documenter.getpostman.com/view/7907941/2s93JwMgmb
 */

const NOWPAYMENTS_API_URL = 'https://api.nowpayments.io/v1'
const NOWPAYMENTS_SANDBOX_API_URL = 'https://api-sandbox.nowpayments.io/v1'

export interface CreateInvoiceParams {
  priceAmount: number // USD amount
  priceCurrency?: string // Default: USD
  orderId: string
  orderDescription: string
  successUrl: string
  cancelUrl: string
  ipnCallbackUrl: string
}

export interface NowPaymentsInvoice {
  id: string
  order_id: string
  order_description: string
  price_amount: number
  price_currency: string
  invoice_url: string
  created_at: string
}

/**
 * Get NOWPayments API Key from environment
 */
function getApiKey (): string {
  const apiKey = process.env.NOWPAYMENTS_API_KEY
  if (!apiKey) {
    throw new Error('NOWPAYMENTS_API_KEY environment variable is not set')
  }
  return apiKey
}

/**
 * Get API base URL based on environment
 */
function getBaseUrl (): string {
  return process.env.APP_ENV === 'prod'
    ? NOWPAYMENTS_API_URL
    : NOWPAYMENTS_SANDBOX_API_URL
}

/**
 * Create a new invoice for cryptocurrency payment
 *
 * @param params - Invoice parameters
 * @returns Created invoice data including invoice_url for redirect
 */
export async function createInvoice (params: CreateInvoiceParams): Promise<NowPaymentsInvoice> {
  const apiKey = getApiKey()
  const baseUrl = getBaseUrl()

  const body = {
    price_amount: params.priceAmount,
    price_currency: params.priceCurrency || PAYMENT_CURRENCY,
    order_id: params.orderId,
    order_description: params.orderDescription,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    ipn_callback_url: params.ipnCallbackUrl,
  }

  const response = await fetch(`${baseUrl}/invoice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('NOWPayments API error:', response.status, errorText)
    throw new Error(`Failed to create invoice: ${response.status}`)
  }

  const result: NowPaymentsInvoice = await response.json()
  return result
}
