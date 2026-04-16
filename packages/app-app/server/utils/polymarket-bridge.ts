/**
 * Polymarket Bridge Utility
 *
 * @see https://docs.polymarket.com/trading/bridge
 */

import { formatUnits, parseUnits } from 'viem'

const BRIDGE_API_BASE = 'https://bridge.polymarket.com' as const

// -- Types --------------------------------------------------------------------

/** Raw asset entry from the Bridge API */
interface BridgeRawAsset {
  chainId: string
  chainName: string
  token: {
    name: string
    symbol: string
    address: string
    decimals: number
  }
  minCheckoutUsd: number
}

interface BridgeRawSupportedAssetsResponse {
  supportedAssets: BridgeRawAsset[]
  note: string
}

export interface BridgeSupportedAssetsResponse {
  chains: BridgeSupportedChain[]
}

export interface BridgeQuoteRequest {
  toChainId: number
  toTokenAddress: string
  recipientAddr: string
  /** Human-readable amount (e.g., "100"), will be converted to base units */
  amount: string
  /** Destination token decimals (default 6) */
  toDecimals?: number
}

interface BridgeRawQuoteResponse {
  estCheckoutTimeMs: number
  estInputUsd: number
  estOutputUsd: number
  estToTokenBaseUnit: string
  quoteId: string
  estFeeBreakdown: {
    gasUsd?: number
    appFeeLabel?: string
    appFeePercent?: number
    appFeeUsd?: number
    fillCostPercent?: number
    fillCostUsd?: number
    maxSlippage?: number
    minReceived?: number
    swapImpact?: number
    swapImpactUsd?: number
    totalImpact?: number
    totalImpactUsd?: number
  }
}

export interface BridgeWithdrawRequest {
  /** Polymarket wallet address on Polygon (funder) */
  address: string
  toChainId: number
  toTokenAddress: string
  recipientAddr: string
}

/** Response from bridge /withdraw and /deposit endpoints */
export interface BridgeAddressResponse {
  address: BridgeAddresses
  note: string
}

// -- Helpers ------------------------------------------------------------------

const supportedChainSet = new Set(SUPPORTED_CHAIN_NAMES)
const supportedTokenSet = new Set(SUPPORTED_TOKEN_SYMBOLS)

async function bridgeFetch<T> (path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BRIDGE_API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(
      `Bridge ${path} API failed: ${response.status} ${response.statusText} - ${errorText}`,
    )
  }

  return response.json() as Promise<T>
}

// -- Supported Assets ---------------------------------------------------------

export async function getBridgeSupportedAssets (): Promise<BridgeSupportedAssetsResponse> {
  const raw = await bridgeFetch<BridgeRawSupportedAssetsResponse>('/supported-assets')

  // Dedup by "chainName:symbol". Some chains have both bridged and native USDC;
  // prefer the "cleaner" token name (e.g., "USD Coin" over "USD Coin (PoS)").
  const chainIds = new Map<string, number>()
  const bestAsset = new Map<string, BridgeRawAsset>()
  for (const asset of raw.supportedAssets) {
    if (!supportedChainSet.has(asset.chainName)) continue
    if (!supportedTokenSet.has(asset.token.symbol)) continue
    chainIds.set(asset.chainName, Number(asset.chainId))
    const key = `${asset.chainName}:${asset.token.symbol}`
    const existing = bestAsset.get(key)
    if (!existing) {
      bestAsset.set(key, asset)
    } else if (existing.token.name.includes('(') && !asset.token.name.includes('(')) {
      bestAsset.set(key, asset)
    }
  }

  // Build result in SUPPORTED_CHAIN_NAMES / SUPPORTED_TOKEN_SYMBOLS order
  const chains: BridgeSupportedChain[] = []
  for (const chainName of SUPPORTED_CHAIN_NAMES) {
    const chainId = chainIds.get(chainName)
    if (chainId === undefined) continue
    const tokens: BridgeSupportedToken[] = []
    for (const symbol of SUPPORTED_TOKEN_SYMBOLS) {
      const asset = bestAsset.get(`${chainName}:${symbol}`)
      if (!asset) continue
      tokens.push({
        address: asset.token.address,
        symbol: asset.token.symbol,
        name: asset.token.name,
        decimals: asset.token.decimals,
        minCheckoutUsd: asset.minCheckoutUsd,
      })
    }
    if (tokens.length > 0) {
      chains.push({ chainId, name: chainName, tokens })
    }
  }

  return { chains }
}

// -- Quote --------------------------------------------------------------------

export async function getBridgeQuote (
  params: BridgeQuoteRequest,
): Promise<BridgeQuoteResponse> {
  const toDecimals = params.toDecimals ?? 6
  const fromAmountBaseUnit = parseUnits(params.amount, USDCE_DECIMALS).toString()

  const raw = await bridgeFetch<BridgeRawQuoteResponse>('/quote', {
    method: 'POST',
    body: JSON.stringify({
      fromAmountBaseUnit,
      fromChainId: String(POLYGON_CHAIN_ID),
      fromTokenAddress: USDCE_ADDRESS,
      recipientAddress: params.recipientAddr,
      toChainId: String(params.toChainId),
      toTokenAddress: params.toTokenAddress,
    }),
  })

  const estOutput = Number(
    formatUnits(BigInt(raw.estToTokenBaseUnit), toDecimals),
  ).toFixed(2)

  // Fee: prefer totalImpact fields, fallback to input-output delta
  const fee = raw.estFeeBreakdown
  const feeUsd = fee.totalImpactUsd ?? (raw.estInputUsd - raw.estOutputUsd)
  const feePercent = fee.totalImpact ?? (raw.estInputUsd > 0 ? feeUsd / raw.estInputUsd : 0)

  return {
    estimatedOutput: estOutput,
    feeUsd: Math.abs(feeUsd).toFixed(2),
    feePercent: (Math.abs(feePercent) * 100).toFixed(2),
    estimatedTime: Math.round(raw.estCheckoutTimeMs / 1000),
  }
}

// -- Withdraw -----------------------------------------------------------------

export async function getBridgeWithdrawAddress (
  params: BridgeWithdrawRequest,
): Promise<BridgeAddressResponse> {
  return bridgeFetch<BridgeAddressResponse>('/withdraw', {
    method: 'POST',
    body: JSON.stringify({
      address: params.address,
      toChainId: String(params.toChainId),
      toTokenAddress: params.toTokenAddress,
      recipientAddr: params.recipientAddr,
    }),
  })
}

// -- Deposit ------------------------------------------------------------------

export async function getBridgeDepositAddress (
  address: string,
): Promise<BridgeAddressResponse> {
  return bridgeFetch<BridgeAddressResponse>('/deposit', {
    method: 'POST',
    body: JSON.stringify({ address }),
  })
}
