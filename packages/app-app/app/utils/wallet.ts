/** Chain icon file mapping */
export const CHAIN_ICONS: Record<string, string> = {
  Polygon: '/img/chain/polygon.svg',
  Ethereum: '/img/chain/ethereum.svg',
  Solana: '/img/chain/solana.svg',
  Tron: '/img/chain/tron.svg',
  BSC: '/img/chain/bsc.svg',
  Base: '/img/chain/base.svg',
  Arbitrum: '/img/chain/arbitrum.svg',
  Optimism: '/img/chain/optimism.svg',
}

/** Token icon file mapping */
export const TOKEN_ICONS: Record<string, string> = {
  'USDC.e': '/img/symbol/usdc.png',
  'USDC': '/img/symbol/usdc.png',
  'USDT': '/img/symbol/usdt.svg',
}

/** Block explorer URLs per chain (tx / address / token) */
export const CHAIN_EXPLORERS: Record<string, { tx: string, address: string, token: string }> = {
  Polygon: { tx: 'https://polygonscan.com/tx/', address: 'https://polygonscan.com/address/', token: 'https://polygonscan.com/token/' },
  Ethereum: { tx: 'https://etherscan.io/tx/', address: 'https://etherscan.io/address/', token: 'https://etherscan.io/token/' },
  BSC: { tx: 'https://bscscan.com/tx/', address: 'https://bscscan.com/address/', token: 'https://bscscan.com/token/' },
  Base: { tx: 'https://basescan.org/tx/', address: 'https://basescan.org/address/', token: 'https://basescan.org/token/' },
  Arbitrum: { tx: 'https://arbiscan.io/tx/', address: 'https://arbiscan.io/address/', token: 'https://arbiscan.io/token/' },
  Optimism: { tx: 'https://optimistic.etherscan.io/tx/', address: 'https://optimistic.etherscan.io/address/', token: 'https://optimistic.etherscan.io/token/' },
  Solana: { tx: 'https://solscan.io/tx/', address: 'https://solscan.io/account/', token: 'https://solscan.io/token/' },
  Tron: { tx: 'https://tronscan.org/#/transaction/', address: 'https://tronscan.org/#/address/', token: 'https://tronscan.org/#/token20/' },
}

export function getExplorerTxUrl (chain: string, hash: string): string {
  return `${CHAIN_EXPLORERS[chain]?.tx ?? ''}${hash}`
}

export function getExplorerAddressUrl (chain: string, address: string): string {
  return `${CHAIN_EXPLORERS[chain]?.address ?? ''}${address}`
}

export function getExplorerTokenUrl (chain: string, address: string): string {
  return `${CHAIN_EXPLORERS[chain]?.token ?? ''}${address}`
}

/** Polygon USDC.e token (direct transfer, always available) */
export const POLYGON_USDC_E_TOKEN: BridgeSupportedToken = {
  address: USDCE_ADDRESS,
  symbol: 'USDC.e',
  name: 'Bridged USDC',
  decimals: 6,
  minCheckoutUsd: 0,
}

export function getChainIcon (name: string): string {
  return CHAIN_ICONS[name] ?? ''
}

export function getTokenIcon (symbol: string): string {
  return TOKEN_ICONS[symbol] ?? '/img/symbol/usdc.png'
}
