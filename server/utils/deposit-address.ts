/**
 * Polymarket Bridge Deposit Address Utility
 *
 * Retrieves deposit addresses via Polymarket bridge API.
 * Assets sent to these addresses are automatically bridged and swapped to USDC.e on Polygon.
 *
 * @see https://docs.polymarket.com/developers/misc-endpoints/bridge-deposit
 */

import type { Address } from 'viem'

const BRIDGE_API_URL = 'https://bridge.polymarket.com/deposit' as const

/**
 * Deposit addresses for different chains
 */
export interface DepositAddresses {
  /** EVM-compatible chains deposit address */
  evm: string
  /** Solana deposit address */
  svm: string
  /** Bitcoin deposit address */
  btc: string
}

/**
 * Polymarket deposit address API response
 */
export interface DepositAddressResponse {
  /** Deposit addresses for different chains */
  address: DepositAddresses
  /** API usage note */
  note: string
}

export interface GetDepositAddressOptions {
  /** Polymarket wallet address */
  address: Address
}

/**
 * Get Polymarket deposit addresses
 *
 * Retrieves unique deposit addresses for different chains/tokens.
 * Funds sent to these addresses are automatically bridged to Polygon and swapped to USDC.e.
 *
 * @param options - Options for getting deposit addresses
 * @returns Deposit address response with deposit addresses
 */
export async function getDepositAddress (
  options: GetDepositAddressOptions,
): Promise<DepositAddressResponse> {
  const { address } = options

  const response = await fetch(BRIDGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(
      `Polymarket bridge API request failed: ${response.status} ${response.statusText} - ${errorText}`,
    )
  }

  return await response.json()
}
