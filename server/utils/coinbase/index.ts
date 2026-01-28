/**
 * Coinbase Commerce API Client
 *
 * Handles communication with Coinbase Commerce API for cryptocurrency payments.
 * @see https://docs.cdp.coinbase.com/commerce/reference/createcharge
 */

const COINBASE_COMMERCE_API_URL = 'https://api.commerce.coinbase.com'

export interface CreateChargeParams {
  name: string
  description: string
  amount: string // USD amount as string (e.g., "19.00")
  currency?: string // Default: USD
  redirectUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
}

export interface CoinbaseCharge {
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
  expires_at: string
  created_at: string
  metadata?: Record<string, string>
}

interface CoinbaseChargeResponse {
  data: CoinbaseCharge
}

/**
 * Get Coinbase Commerce API Key from environment
 */
function getApiKey (): string {
  const apiKey = process.env.COINBASE_COMMERCE_API_KEY
  if (!apiKey) {
    throw new Error('COINBASE_COMMERCE_API_KEY environment variable is not set')
  }
  return apiKey
}

/**
 * Create a new charge for cryptocurrency payment
 *
 * @param params - Charge parameters
 * @returns Created charge data including hosted_url for redirect
 */
export async function createCharge (params: CreateChargeParams): Promise<CoinbaseCharge> {
  const apiKey = getApiKey()

  const body = {
    name: params.name,
    description: params.description,
    pricing_type: 'fixed_price',
    local_price: {
      amount: params.amount,
      currency: params.currency || PAYMENT_CURRENCY,
    },
    redirect_url: params.redirectUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata,
  }

  const response = await fetch(`${COINBASE_COMMERCE_API_URL}/charges`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CC-Api-Key': apiKey,
      'X-CC-Version': '2018-03-22',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Coinbase Commerce API error:', response.status, errorText)
    throw new Error(`Failed to create charge: ${response.status}`)
  }

  const result: CoinbaseChargeResponse = await response.json()
  return result.data
}

/**
 * Retrieve a charge by ID
 *
 * @param chargeId - The charge ID
 * @returns Charge data
 */
export async function getCharge (chargeId: string): Promise<CoinbaseCharge> {
  const apiKey = getApiKey()

  const response = await fetch(`${COINBASE_COMMERCE_API_URL}/charges/${chargeId}`, {
    method: 'GET',
    headers: {
      'X-CC-Api-Key': apiKey,
      'X-CC-Version': '2018-03-22',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Coinbase Commerce API error:', response.status, errorText)
    throw new Error(`Failed to get charge: ${response.status}`)
  }

  const result: CoinbaseChargeResponse = await response.json()
  return result.data
}
