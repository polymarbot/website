/**
 * Polymarket Cross-chain Deposit Address Utility (Hack)
 *
 * Retrieves cross-chain deposit addresses via fun.xyz API.
 * Funds sent to these addresses are automatically bridged to Polygon and transferred to Safe Wallet.
 *
 * @see https://fun.xyz
 */

import type { Address } from 'viem'

const FUN_API_URL = 'https://api.fun.xyz/v1/eoa' as const
const FUN_API_KEY = 'Y53dikxXdT4E3afI1l8BMBSWgyhKvf65k6Dut1k6' as const
const DEFAULT_CHAIN_ID = '137' as const
const DEFAULT_TOKEN_ADDRESS = USDC_ADDRESS

/**
 * fun.xyz API response
 */
export interface DepositAddressesHack {
  /** Deposit address for EVM-compatible chains */
  depositAddr: Address
  /** Solana deposit address */
  solanaAddr: string
  /** Bitcoin SegWit address */
  btcAddrSegwit: string
  /** Bitcoin Taproot address */
  btcAddrTaproot: string
  /** Bitcoin main deposit address */
  btcDepositAddr: string
}

/**
 * Options for getting deposit addresses (hack)
 */
export interface GetDepositAddressHackOptions {
  /** User wallet address (owner address) */
  ownerAddress: Address
  /** Safe Wallet address (recipient address) */
  safeAddress: Address
}

/**
 * Get Polymarket cross-chain deposit addresses (hack)
 *
 * Retrieves unique deposit addresses via fun.xyz API.
 * Funds sent to these addresses are automatically bridged to Polygon and transferred to Safe Wallet.
 *
 * @param options - Options for getting deposit addresses
 * @returns Deposit addresses for various chains
 */
export async function getDepositAddressHack (
  options: GetDepositAddressHackOptions,
): Promise<DepositAddressesHack> {
  const { ownerAddress, safeAddress } = options

  const requestBody = {
    userId: ownerAddress,
    recipientAddr: safeAddress,
    toChainId: DEFAULT_CHAIN_ID,
    toTokenAddress: DEFAULT_TOKEN_ADDRESS,
  }

  const response = await fetch(FUN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': FUN_API_KEY,
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    throw new Error(`fun.xyz API request failed: ${response.status} ${response.statusText}`)
  }

  return await response.json()
}
