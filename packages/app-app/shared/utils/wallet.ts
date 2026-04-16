export { USDCE_ADDRESS, USDCE_DECIMALS } from '@polymarbot/shared/wallet'

/** Polygon chain ID */
export const POLYGON_CHAIN_ID = 137

/** Chain IDs for EVM-compatible chains supported by the bridge */
export const EVM_CHAIN_IDS = new Set([ POLYGON_CHAIN_ID, 1, 56, 8453, 42161, 10 ])

/** Solana chain ID from bridge API */
export const SOLANA_CHAIN_ID = 1151111081099710

/** Tron chain ID from bridge API */
export const TRON_CHAIN_ID = 728126428

/** Supported chain names in display order */
export const SUPPORTED_CHAIN_NAMES = [
  'Ethereum', 'Polygon', 'BSC', 'Base', 'Arbitrum', 'Optimism', 'Solana', 'Tron',
]

/** Supported token symbols in display order (includes USDC.e for direct transfer) */
export const SUPPORTED_TOKEN_SYMBOLS = [ 'USDC', 'USDC.e', 'USDT' ]

/** Address format patterns by chain type */
const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const TRON_ADDRESS_REGEX = /^T[1-9A-HJ-NP-Za-km-z]{33}$/

/**
 * Validate recipient address format based on chain ID.
 * Returns empty string if valid, or the full i18n key path if invalid.
 */
export function validateRecipientAddress (address: string, chainId: number): string {
  if (EVM_CHAIN_IDS.has(chainId)) {
    return EVM_ADDRESS_REGEX.test(address) ? '' : 'shared.validation.walletAddress.invalid'
  }
  if (chainId === SOLANA_CHAIN_ID) {
    return SOLANA_ADDRESS_REGEX.test(address) ? '' : 'shared.validation.solanaAddress.invalid'
  }
  if (chainId === TRON_CHAIN_ID) {
    return TRON_ADDRESS_REGEX.test(address) ? '' : 'shared.validation.tronAddress.invalid'
  }
  return address.length >= 10 ? '' : 'shared.validation.bridgeRecipientAddr.invalid'
}
